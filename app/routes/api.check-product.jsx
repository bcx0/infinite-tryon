import { json } from "@remix-run/node";
import { isProductAllowed } from "../services/productAccess.server";
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

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let payload = null;

  try {
    payload = await request.json();
  } catch (error) {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const shopId = payload?.shop_id || payload?.shopId || null;
  const productId = payload?.product_id || payload?.productId || null;

  if (!shopId || !productId) {
    return json(
      { error: "shop_id and product_id are required" },
      { status: 400 },
    );
  }

  const validSession = await hasValidSessionForShop(String(shopId).trim().toLowerCase());
  if (!validSession) {
    return json({ error: "Unauthorized: no active session for this shop" }, { status: 401 });
  }

  const result = await isProductAllowed(String(shopId), String(productId));

  return json({
    allowed: result.allowed,
    newlyActivated: result.newlyActivated,
    reason: result.allowed ? undefined : result.reason,
    plan_name: result.planName,
    max_products_allowed: result.maxProductsAllowed,
    active_products_count: result.activeProductsCount,
  });
};
