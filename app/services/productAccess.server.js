import {
  activateProduct,
  canActivateProduct,
  deactivateProduct,
  getActiveProductCount,
  getPlanConfig,
  getOrCreateShop,
  getShopPlan,
  isProductActive,
  listActiveProductIds,
  normalizePlanKey,
  setShopPlan as setShopPlanInDb,
} from "./shopService.server";
import { ADDON } from "../config/plans";

export async function setShopPlan(shopDomain, planName) {
  const normalizedPlan = String(planName || "free").trim().toLowerCase();
  const shop = await setShopPlanInDb(shopDomain, normalizedPlan);
  const planConfig = getPlanConfig(shop.plan);

  return {
    shopId: shop.shopDomain,
    planName: shop.plan,
    maxProductsAllowed: planConfig.maxProducts,
  };
}

export async function getPlanStatus(shopDomain) {
  const shop = await getOrCreateShop(shopDomain);
  const planName = normalizePlanKey(shop.plan);
  const planConfig = getPlanConfig(planName);
  const activeProductsCount = await getActiveProductCount(shop.shopDomain);
  const effectiveMaxProducts = planConfig.maxProducts + (shop.addonActive ? ADDON.extraProducts : 0);

  return {
    shopId: shop.shopDomain,
    planName,
    maxProductsAllowed: effectiveMaxProducts,
    activeProductsCount,
    addonActive: shop.addonActive,
  };
}

export async function isProductAllowed(shopDomain, productId) {
  const shop = await getOrCreateShop(shopDomain);
  const planName = await getShopPlan(shop.shopDomain);
  const planConfig = getPlanConfig(planName);
  const maxProductsAllowed = planConfig.maxProducts;

  const alreadyActive = await isProductActive(shop.shopDomain, productId);
  if (alreadyActive) {
    const activeProductsCount = await getActiveProductCount(shop.shopDomain);
    return {
      allowed: true,
      newlyActivated: false,
      planName,
      maxProductsAllowed,
      activeProductsCount,
    };
  }

  const activation = await canActivateProduct(shop.shopDomain);
  if (activation.allowed) {
    await activateProduct(shop.shopDomain, productId);
    return {
      allowed: true,
      newlyActivated: true,
      planName,
      maxProductsAllowed,
      activeProductsCount: activation.activeProductsCount + 1,
    };
  }

  return {
    allowed: false,
    reason: "LIMIT_REACHED",
    planName,
    maxProductsAllowed,
    activeProductsCount: activation.activeProductsCount,
  };
}

export async function listActiveProducts(shopDomain) {
  return listActiveProductIds(shopDomain);
}

export async function deactivateProductAccess(shopDomain, productId) {
  return deactivateProduct(shopDomain, productId);
}
