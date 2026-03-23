import { json } from "@remix-run/node";
import { getPlanStatus, listActiveProducts } from "../services/productAccess.server";
import { canGenerateTryOn } from "../services/shopService.server";
import db from "../db.server";

async function hasValidSessionForShop(shopDomain) {
  const session = await db.session.findFirst({
    where: {
      shop: shopDomain,
      OR: [{ expires: null }, { expires: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return Boolean(session?.id);
}

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shopId = url.searchParams.get("shop_id") || url.searchParams.get("shopId");

  if (!shopId) {
    return json({ error: "shop_id is required" }, { status: 400 });
  }

  const normalizedShopId = String(shopId).trim().toLowerCase();

  const validSession = await hasValidSessionForShop(normalizedShopId);
  if (!validSession) {
    return json({ error: "Unauthorized: no active session for this shop" }, { status: 401 });
  }

  const [status, activeProducts, tryOnQuota] = await Promise.all([
    getPlanStatus(normalizedShopId),
    listActiveProducts(normalizedShopId),
    canGenerateTryOn(normalizedShopId),
  ]);

  return json({
    plan_name: status.planName,
    max_products_allowed: status.maxProductsAllowed,
    active_products_count: status.activeProductsCount,
    active_product_ids: activeProducts,
    addon_active: status.addonActive,
    max_try_ons_per_month: tryOnQuota.maxTryOnsPerMonth,
    current_try_ons_count: tryOnQuota.currentTryOnsCount,
    try_ons_remaining: Math.max(0, tryOnQuota.maxTryOnsPerMonth - tryOnQuota.currentTryOnsCount),
  });
};
