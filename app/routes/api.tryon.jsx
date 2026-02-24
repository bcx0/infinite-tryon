import { json } from "@remix-run/node";
import { nanoBananaTryOn } from "../services/nanoBananaTryOn";
import db from "../db.server";
import { isProductAllowed } from "../services/productAccess.server";
import { canGenerateTryOn, logTryOn } from "../services/shopService.server";

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateLimitByShop = new Map();

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
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  current.count += 1;
  return { limited: false };
}

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const headerShopDomain = normalizeShopDomain(
    request.headers.get("x-shop-domain"),
  );

  if (!headerShopDomain) {
    return json(
      { success: false, error: "Missing x-shop-domain header" },
      { status: 401 },
    );
  }

  const validSession = await hasValidSessionForShop(headerShopDomain);

  if (!validSession) {
    return json(
      { success: false, error: "Invalid x-shop-domain: no active session" },
      { status: 401 },
    );
  }

  const rateLimit = checkAndIncrementRateLimit(headerShopDomain);
  if (rateLimit.limited) {
    return json(
      {
        success: false,
        error: "Rate limit exceeded: max 10 requests per minute per shop",
        retry_after_seconds: rateLimit.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  let payload = null;

  try {
    payload = await request.json();
  } catch (error) {
    return json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const shopId = normalizeShopDomain(payload?.shop_id || payload?.shopId);

  if (shopId && shopId !== headerShopDomain) {
    return json(
      { success: false, error: "shop_id must match x-shop-domain header" },
      { status: 401 },
    );
  }

  const userImageBase64 =
    payload?.personImageBase64 || payload?.person_image_base64 || payload?.userImage || payload?.user_image;
  const userImageUrl =
    payload?.personImageUrl || payload?.person_image_url || null;
  const userImage = nonEmptyString(userImageBase64)
    ? userImageBase64.trim()
    : nonEmptyString(userImageUrl)
      ? userImageUrl.trim()
      : null;

  const productImageRaw =
    payload?.garmentImageUrl ||
    payload?.garment_image_url ||
    payload?.productImage ||
    payload?.product_image;
  const productImage = nonEmptyString(productImageRaw)
    ? productImageRaw.trim()
    : null;
  const garmentType = payload?.garmentType || payload?.options?.garmentType;
  const productId = payload?.product_id || payload?.productId;

  if (!userImage || !productImage) {
    return json(
      {
        success: false,
        error:
          "Missing required params: garmentImageUrl and personImageBase64 or personImageUrl",
      },
      { status: 400 },
    );
  }

  if (headerShopDomain && productId) {
    const allowedResult = await isProductAllowed(
      String(headerShopDomain),
      String(productId),
    );

    if (!allowedResult.allowed) {
      return json(
        {
          success: false,
          error: "LIMIT_REACHED",
          reason: "LIMIT_REACHED",
          plan_name: allowedResult.planName,
          max_products_allowed: allowedResult.maxProductsAllowed,
          active_products_count: allowedResult.activeProductsCount,
        },
        { status: 403 },
      );
    }
  }

  console.info("[tryon] action start", {
    shopId: headerShopDomain,
    productId,
    garmentType,
    userImageLength: userImage?.length,
    productImageLength: productImage?.length,
    useMock: String(process.env.USE_MOCK || "").toLowerCase() === "true",
  });

  const tryOnQuota = await canGenerateTryOn(headerShopDomain);
  if (!tryOnQuota.allowed) {
    return json(
      {
        success: false,
        error: "TRYON_QUOTA_EXCEEDED",
        reason: "TRYON_QUOTA_EXCEEDED",
        plan_name: tryOnQuota.planKey,
        max_tryons_per_month: tryOnQuota.maxTryOnsPerMonth,
        current_tryons_count: tryOnQuota.currentTryOnsCount,
      },
      { status: 403 },
    );
  }

  const result = await nanoBananaTryOn({
    userImage,
    productImage,
    garmentType,
    options: payload?.options || {},
  });

  if (!result.success) {
    await logTryOn(
      headerShopDomain,
      typeof productId === "string" ? productId : null,
      "error",
      null,
      result.error || "TRYON_FAILED",
    );

    return json(
      {
        success: false,
        error: result.error || "TRYON_FAILED",
      },
      { status: 500 },
    );
  }

  await logTryOn(
    headerShopDomain,
    typeof productId === "string" ? productId : null,
    "success",
    result.imageUrl,
    null,
  );

  return json({
    success: true,
    imageUrl: result.imageUrl,
    mock: result.mock || false,
  });
};
