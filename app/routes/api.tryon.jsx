import { json } from "@remix-run/node";
import { replicateTryOn } from "../services/replicateTryOn.server";
import db from "../db.server";
import { isProductAllowed } from "../services/productAccess.server";
import { canGenerateTryOn, logTryOn } from "../services/shopService.server";
import { corsHeaders } from "../utils/cors.server";

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateLimitByShop = new Map();

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }
  return json({ error: "Method not allowed" }, { status: 405 });
};

function normalizeShopDomain(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function ensureAbsoluteUrl(url) {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return trimmed;
}

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

function checkAndIncrementRateLimit(shopDomain) {
  const now = Date.now();
  const current = rateLimitByShop.get(shopDomain);
  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitByShop.set(shopDomain, { count: 1, windowStart: now });
    return { limited: false };
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - current.windowStart);
    return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  current.count += 1;
  return { limited: false };
}

export const action = async ({ request }) => {
  const headers = corsHeaders(request);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers });
  }

  try {
    const headerShopDomain = normalizeShopDomain(request.headers.get("x-shop-domain"));

    if (!headerShopDomain) {
      return json({ success: false, error: "Missing x-shop-domain header" }, { status: 401, headers });
    }

    const validSession = await hasValidSessionForShop(headerShopDomain);
    if (!validSession) {
      return json({ success: false, error: "Invalid x-shop-domain: no active session" }, { status: 401, headers });
    }

    const rateLimit = checkAndIncrementRateLimit(headerShopDomain);
    if (rateLimit.limited) {
      return json({ success: false, error: "Rate limit exceeded", retry_after_seconds: rateLimit.retryAfterSeconds }, { status: 429, headers });
    }

    let payload = null;
    try {
      payload = await request.json();
    } catch (error) {
      return json({ success: false, error: "Invalid JSON body" }, { status: 400, headers });
    }

    const shopId = normalizeShopDomain(payload?.shop_id || payload?.shopId);
    if (shopId && shopId !== headerShopDomain) {
      return json({ success: false, error: "shop_id must match x-shop-domain header" }, { status: 401, headers });
    }

    const userImageBase64 = payload?.personImageBase64 || payload?.person_image_base64 || payload?.userImage || payload?.user_image;
    const userImageUrl = payload?.personImageUrl || payload?.person_image_url || null;
    const userImage = nonEmptyString(userImageBase64) ? userImageBase64.trim() : nonEmptyString(userImageUrl) ? userImageUrl.trim() : null;

    const productImageRaw = payload?.garmentImageUrl || payload?.garment_image_url || payload?.productImage || payload?.product_image;
    const productImage = nonEmptyString(productImageRaw) ? ensureAbsoluteUrl(productImageRaw) : null;
    const garmentType = payload?.garmentType || payload?.options?.garmentType;
    const productId = payload?.product_id || payload?.productId;

    if (!userImage || !productImage) {
      return json({ success: false, error: "Missing required params: garmentImageUrl and personImageBase64 or personImageUrl" }, { status: 400, headers });
    }

    if (headerShopDomain && productId) {
      const allowedResult = await isProductAllowed(String(headerShopDomain), String(productId));
      if (!allowedResult.allowed) {
        return json({ success: false, error: "LIMIT_REACHED", reason: "LIMIT_REACHED", plan_name: allowedResult.planName, max_products_allowed: allowedResult.maxProductsAllowed, active_products_count: allowedResult.activeProductsCount }, { status: 403, headers });
      }
    }

    console.info("[tryon] action start", { shopId: headerShopDomain, productId, garmentType, userImageLength: userImage?.length, productImageLength: productImage?.length, useMock: String(process.env.USE_MOCK || "").toLowerCase() === "true" });

    const tryOnQuota = await canGenerateTryOn(headerShopDomain);
    if (!tryOnQuota.allowed) {
      return json({ success: false, error: "TRYON_QUOTA_EXCEEDED", reason: "TRYON_QUOTA_EXCEEDED", plan_name: tryOnQuota.planKey, max_tryons_per_month: tryOnQuota.maxTryOnsPerMonth, current_tryons_count: tryOnQuota.currentTryOnsCount }, { status: 403, headers });
    }

    const result = await replicateTryOn({ userImage, productImage, garmentType, options: payload?.options || {} });

    if (!result.success) {
      console.error("[tryon] generation failed", { shopId: headerShopDomain, productId, error: result.error });
      try {
        await logTryOn(headerShopDomain, typeof productId === "string" ? productId : null, "error", null, result.error || "TRYON_FAILED");
      } catch (logErr) {
        console.error("[tryon] failed to log error", logErr?.message);
      }
      return json({ success: false, error: result.error || "TRYON_FAILED" }, { status: 500, headers });
    }

    try {
      await logTryOn(headerShopDomain, typeof productId === "string" ? productId : null, "success", result.imageUrl, null);
    } catch (logErr) {
      console.error("[tryon] failed to log success", logErr?.message);
    }

    return json({ success: true, imageUrl: result.imageUrl, mock: result.mock || false }, { headers });
  } catch (unexpectedError) {
    console.error("[tryon] UNHANDLED ERROR", unexpectedError?.message || unexpectedError, unexpectedError?.stack);
    return json({ success: false, error: "Internal server error" }, { status: 500, headers });
  }
};
