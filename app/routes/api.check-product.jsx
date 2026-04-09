import { json } from "@remix-run/node";
import { isProductAllowed } from "../services/productAccess.server";
import db from "../db.server";
import { corsHeaders } from "../utils/cors.server";
import { checkRateLimit } from "../utils/rateLimit.server";

const CHECK_PRODUCT_MAX = 20;
const CHECK_PRODUCT_WINDOW_MS = 60_000;

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }
  return json({ error: "Method not allowed" }, { status: 405 });
};

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
    return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(request) });
  }

  let payload = null;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders(request) });
  }

  const shopId = payload?.shop_id || payload?.shopId || null;
  const productId = payload?.product_id || payload?.productId || null;

  if (!shopId || !productId) {
    return json({ error: "shop_id and product_id are required" }, { status: 400, headers: corsHeaders(request) });
  }

  const normalizedShopId = String(shopId).trim().toLowerCase();

  const rateLimit = await checkRateLimit(`check:${normalizedShopId}`, CHECK_PRODUCT_MAX, CHECK_PRODUCT_WINDOW_MS);
  if (rateLimit.limited) {
    return json({ error: "Too many requests", retry_after_seconds: rateLimit.retryAfterSeconds }, { status: 429, headers: corsHeaders(request) });
  }

  const validSession = await hasValidSessionForShop(normalizedShopId);
  if (!validSession) {
    return json({ error: "Unauthorized: no active session for this shop" }, { status: 401, headers: corsHeaders(request) });
  }

  const result = await isProductAllowed(normalizedShopId, String(productId));

  return json({
    allowed: result.allowed,
    newlyActivated: result.newlyActivated,
    reason: result.allowed ? undefined : result.reason,
    plan_name: result.planName,
    max_products_allowed: result.maxProductsAllowed,
    active_products_count: result.activeProductsCount,
  }, { headers: corsHeaders(request) });
};
