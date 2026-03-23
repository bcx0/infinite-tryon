import { PLANS, ADDON } from "../config/plans";
import db from "../db.server";

function assertShopDomain(shopDomain) {
  if (!shopDomain || typeof shopDomain !== "string" || !shopDomain.trim()) {
    throw new Error("shopDomain is required");
  }

  return shopDomain.trim().toLowerCase();
}

function assertProductId(productId) {
  if (!productId || typeof productId !== "string" || !productId.trim()) {
    throw new Error("productId is required");
  }

  return productId.trim();
}

export function normalizePlanKey(planKey) {
  if (!planKey || typeof planKey !== "string") {
    return "free";
  }

  const normalized = planKey.trim().toLowerCase();
  return PLANS[normalized] ? normalized : "free";
}

export function getPlanConfig(planKey) {
  return PLANS[normalizePlanKey(planKey)];
}

export async function getOrCreateShop(shopDomain) {
  const normalizedShopDomain = assertShopDomain(shopDomain);

  return db.shop.upsert({
    where: { shopDomain: normalizedShopDomain },
    update: {},
    create: { shopDomain: normalizedShopDomain },
  });
}

export async function getShopPlan(shopDomain) {
  const shop = await getOrCreateShop(shopDomain);
  return normalizePlanKey(shop.plan);
}

export async function setShopPlan(shopDomain, plan) {
  const normalizedShopDomain = assertShopDomain(shopDomain);
  await getOrCreateShop(normalizedShopDomain);

  return db.shop.update({
    where: { shopDomain: normalizedShopDomain },
    data: { plan: normalizePlanKey(plan) },
  });
}

export async function getActiveProductCount(shopDomain) {
  const normalizedShopDomain = assertShopDomain(shopDomain);

  return db.product.count({
    where: {
      shopDomain: normalizedShopDomain,
      isActive: true,
    },
  });
}

export async function isProductActive(shopDomain, productId) {
  const normalizedShopDomain = assertShopDomain(shopDomain);
  const normalizedProductId = assertProductId(productId);

  const product = await db.product.findUnique({
    where: {
      shopDomain_productId: {
        shopDomain: normalizedShopDomain,
        productId: normalizedProductId,
      },
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  return Boolean(product?.id && product.isActive);
}

export async function activateProduct(shopDomain, productId) {
  const normalizedShopDomain = assertShopDomain(shopDomain);
  const normalizedProductId = assertProductId(productId);
  await getOrCreateShop(normalizedShopDomain);

  return db.product.upsert({
    where: {
      shopDomain_productId: {
        shopDomain: normalizedShopDomain,
        productId: normalizedProductId,
      },
    },
    update: {
      isActive: true,
    },
    create: {
      shopDomain: normalizedShopDomain,
      productId: normalizedProductId,
      isActive: true,
    },
  });
}

export async function deactivateProduct(shopDomain, productId) {
  const normalizedShopDomain = assertShopDomain(shopDomain);
  const normalizedProductId = assertProductId(productId);

  const result = await db.product.updateMany({
    where: {
      shopDomain: normalizedShopDomain,
      productId: normalizedProductId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  return result.count > 0;
}

export async function listActiveProductIds(shopDomain) {
  const normalizedShopDomain = assertShopDomain(shopDomain);
  const products = await db.product.findMany({
    where: {
      shopDomain: normalizedShopDomain,
      isActive: true,
    },
    select: {
      productId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return products.map((entry) => entry.productId);
}

export async function canActivateProduct(shopDomain) {
  const normalizedShopDomain = assertShopDomain(shopDomain);
  const shop = await getOrCreateShop(normalizedShopDomain);
  const planKey = normalizePlanKey(shop.plan);
  const planConfig = getPlanConfig(planKey);
  const activeProductsCount = await getActiveProductCount(normalizedShopDomain);
  const effectiveMaxProducts = planConfig.maxProducts + (shop.addonActive ? ADDON.extraProducts : 0);

  return {
    allowed: activeProductsCount < effectiveMaxProducts,
    planKey,
    maxProducts: effectiveMaxProducts,
    activeProductsCount,
  };
}

export async function canGenerateTryOn(shopDomain) {
  const normalizedShopDomain = assertShopDomain(shopDomain);
  const shop = await getOrCreateShop(normalizedShopDomain);
  const planKey = normalizePlanKey(shop.plan);
  const planConfig = getPlanConfig(planKey);
  const effectiveMaxTryOns = planConfig.maxTryOnsPerMonth + (shop.addonActive ? ADDON.extraTryOns : 0);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const currentTryOnsCount = await db.tryOnLog.count({
    where: {
      shopDomain: normalizedShopDomain,
      createdAt: {
        gte: monthStart,
        lt: monthEnd,
      },
    },
  });

  return {
    allowed: currentTryOnsCount < effectiveMaxTryOns,
    planKey,
    maxTryOnsPerMonth: effectiveMaxTryOns,
    currentTryOnsCount,
  };
}

export async function logTryOn(
  shopDomain,
  productId,
  status,
  resultImageUrl,
  errorMessage,
) {
  const normalizedShopDomain = assertShopDomain(shopDomain);
  await getOrCreateShop(normalizedShopDomain);

  return db.tryOnLog.create({
    data: {
      shopDomain: normalizedShopDomain,
      productId:
        typeof productId === "string" && productId.trim()
          ? productId.trim()
          : null,
      status: String(status || "pending").trim().toLowerCase() || "pending",
      resultImageUrl:
        typeof resultImageUrl === "string" && resultImageUrl.trim()
          ? resultImageUrl.trim()
          : null,
      errorMessage:
        typeof errorMessage === "string" && errorMessage.trim()
          ? errorMessage.trim()
          : null,
    },
  });
}
