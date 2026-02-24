import { json } from "@remix-run/node";
import { getPlanStatus, listActiveProducts } from "../services/productAccess.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shopId = url.searchParams.get("shop_id") || url.searchParams.get("shopId");

  if (!shopId) {
    return json({ error: "shop_id is required" }, { status: 400 });
  }

  const status = await getPlanStatus(String(shopId));
  const activeProducts = await listActiveProducts(String(shopId));

  return json({
    plan_name: status.planName,
    max_products_allowed: status.maxProductsAllowed,
    active_products_count: status.activeProductsCount,
    active_product_ids: activeProducts,
  });
};
