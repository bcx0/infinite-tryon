import Stripe from "stripe";
import { PLANS, ADDON } from "../config/plans";
import db from "../db.server";
import {
  getOrCreateShop,
  normalizePlanKey,
  setShopPlan,
} from "./shopService.server";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey);
}

function getPaidPlanConfig(planKey) {
  const normalizedPlan = normalizePlanKey(planKey);
  if (normalizedPlan === "free") {
    throw new Error("Invalid planKey: free plan does not require checkout");
  }

  const planConfig = PLANS[normalizedPlan];
  if (!planConfig?.stripePriceId) {
    throw new Error(`Missing Stripe price ID for plan ${normalizedPlan}`);
  }

  return { normalizedPlan, planConfig };
}

function planFromStripePriceId(priceId) {
  const entry = Object.entries(PLANS).find(
    ([, plan]) => plan.stripePriceId && plan.stripePriceId === priceId,
  );

  return entry ? entry[0] : null;
}

function isAddonPriceId(priceId) {
  const addonPriceId = process.env.STRIPE_PRICE_ADDON;
  return Boolean(addonPriceId && priceId === addonPriceId);
}

function dateFromStripeTimestamp(unixSeconds) {
  if (!unixSeconds || typeof unixSeconds !== "number") {
    return null;
  }

  return new Date(unixSeconds * 1000);
}

// Deactivate excess products when a merchant downgrades.
// Keeps the oldest active products (FIFO) up to maxProducts, deactivates the rest.
async function enforceProductLimit(shopDomain, maxProducts) {
  const activeProducts = await db.product.findMany({
    where: { shopDomain, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { productId: true },
  });

  if (activeProducts.length <= maxProducts) return;

  const toDeactivate = activeProducts.slice(maxProducts);

  await db.product.updateMany({
    where: {
      shopDomain,
      productId: { in: toDeactivate.map((p) => p.productId) },
    },
    data: { isActive: false },
  });

  console.info("[stripe] downgrade: deactivated excess products", {
    shopDomain,
    deactivated: toDeactivate.length,
    maxProductsAllowed: maxProducts,
  });
}

export async function createOrGetCustomer(shopDomain, email) {
  const stripe = getStripeClient();
  const shop = await getOrCreateShop(shopDomain);

  if (shop.stripeCustomerId) {
    return stripe.customers.retrieve(shop.stripeCustomerId);
  }

  const customer = await stripe.customers.create({
    email:
      typeof email === "string" && email.trim() ? email.trim().toLowerCase() : undefined,
    metadata: {
      shopDomain: shop.shopDomain,
    },
  });

  await db.shop.update({
    where: { shopDomain: shop.shopDomain },
    data: { stripeCustomerId: customer.id },
  });

  return customer;
}

export async function createCheckoutSession(shopDomain, planKey, returnBaseUrl) {
  const stripe = getStripeClient();
  const { normalizedPlan, planConfig } = getPaidPlanConfig(planKey);
  const shop = await getOrCreateShop(shopDomain);

  const customer = await createOrGetCustomer(shop.shopDomain);
  const cleanedReturnBaseUrl = String(returnBaseUrl || "").replace(/\/$/, "");
  if (!cleanedReturnBaseUrl) {
    throw new Error("returnBaseUrl is required");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [
      {
        price: planConfig.stripePriceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        shopDomain: shop.shopDomain,
        planKey: normalizedPlan,
      },
    },
    metadata: {
      shopDomain: shop.shopDomain,
      planKey: normalizedPlan,
    },
    success_url: `${cleanedReturnBaseUrl}?checkout=success&plan=${normalizedPlan}`,
    cancel_url: `${cleanedReturnBaseUrl}?checkout=cancel`,
  });

  return session;
}

export async function createAddonCheckoutSession(shopDomain, returnBaseUrl) {
  const stripe = getStripeClient();
  const addonPriceId = process.env.STRIPE_PRICE_ADDON;
  if (!addonPriceId) {
    throw new Error("Missing STRIPE_PRICE_ADDON");
  }

  const shop = await getOrCreateShop(shopDomain);
  if (!shop.stripeCustomerId) {
    throw new Error("No Stripe customer found — subscribe to a paid plan first");
  }

  if (shop.addonActive) {
    throw new Error("Add-on is already active for this shop");
  }

  const cleanedReturnBaseUrl = String(returnBaseUrl || "").replace(/\/$/, "");
  if (!cleanedReturnBaseUrl) {
    throw new Error("returnBaseUrl is required");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: shop.stripeCustomerId,
    line_items: [{ price: addonPriceId, quantity: 1 }],
    metadata: {
      shopDomain: shop.shopDomain,
      isAddon: "true",
    },
    subscription_data: {
      metadata: {
        shopDomain: shop.shopDomain,
        isAddon: "true",
      },
    },
    success_url: `${cleanedReturnBaseUrl}?checkout=addon_success`,
    cancel_url: `${cleanedReturnBaseUrl}?checkout=cancel`,
  });

  return session;
}

export async function createPortalSession(shopDomain, returnUrl) {
  const stripe = getStripeClient();
  const shop = await getOrCreateShop(shopDomain);

  if (!shop.stripeCustomerId) {
    throw new Error("No Stripe customer found for this shop");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: shop.stripeCustomerId,
    return_url: returnUrl,
  });

  return portalSession;
}

export async function handleWebhookEvent(rawBody, signature) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const shopDomain = session.metadata?.shopDomain;
      const isAddon = session.metadata?.isAddon === "true";
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      if (!shopDomain || !subscriptionId) break;

      if (isAddon) {
        // Addon subscription: activate addon, store its subscription ID
        await db.shop.update({
          where: { shopDomain: shopDomain.toLowerCase() },
          data: {
            addonActive: true,
            addonSubscriptionId: subscriptionId,
            stripeCustomerId: customerId || undefined,
          },
        });

        console.info("[stripe] addon activated", { shopDomain, subscriptionId });
      } else {
        // Main plan subscription
        const planKey = normalizePlanKey(session.metadata?.planKey);
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = dateFromStripeTimestamp(subscription.current_period_end);

        await db.shop.update({
          where: { shopDomain: shopDomain.toLowerCase() },
          data: {
            stripeCustomerId: customerId || undefined,
            stripeSubscriptionId: subscription.id,
            stripeStatus: subscription.status,
            currentPeriodEnd: periodEnd,
          },
        });

        await setShopPlan(shopDomain, planKey);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (!customerId) break;

      const shop = await db.shop.findFirst({
        where: { stripeCustomerId: customerId },
        select: { shopDomain: true, addonSubscriptionId: true, addonActive: true },
      });

      if (!shop?.shopDomain) break;

      // If this is the addon subscription, ignore plan logic
      const isAddonSub =
        subscription.id === shop.addonSubscriptionId ||
        subscription.items?.data?.some((item) => isAddonPriceId(item.price?.id));

      if (isAddonSub) {
        // Sync addon active state with subscription status
        const addonNowActive = subscription.status === "active" || subscription.status === "trialing";
        await db.shop.update({
          where: { shopDomain: shop.shopDomain },
          data: { addonActive: addonNowActive },
        });
        break;
      }

      // Main plan subscription updated
      const firstItem = subscription.items?.data?.[0];
      const newPlanKey = planFromStripePriceId(firstItem?.price?.id) || "free";
      const periodEnd = dateFromStripeTimestamp(subscription.current_period_end);

      await db.shop.update({
        where: { shopDomain: shop.shopDomain },
        data: {
          stripeSubscriptionId: subscription.id,
          stripeStatus: subscription.status,
          currentPeriodEnd: periodEnd,
        },
      });

      await setShopPlan(shop.shopDomain, newPlanKey);

      // Enforce product limit after plan change (handles downgrades)
      const newPlanConfig = PLANS[newPlanKey] || PLANS.free;
      const updatedShop = await db.shop.findUnique({
        where: { shopDomain: shop.shopDomain },
        select: { addonActive: true },
      });
      const effectiveMax =
        newPlanConfig.maxProducts + (updatedShop?.addonActive ? ADDON.extraProducts : 0);
      await enforceProductLimit(shop.shopDomain, effectiveMax);

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (!customerId) break;

      const shop = await db.shop.findFirst({
        where: { stripeCustomerId: customerId },
        select: { shopDomain: true, addonSubscriptionId: true },
      });

      if (!shop?.shopDomain) break;

      const isAddonSub =
        subscription.id === shop.addonSubscriptionId ||
        subscription.items?.data?.some((item) => isAddonPriceId(item.price?.id));

      if (isAddonSub) {
        // Addon canceled: deactivate addon, enforce product limit
        const currentShop = await db.shop.findUnique({
          where: { shopDomain: shop.shopDomain },
          select: { plan: true },
        });
        const planConfig = PLANS[normalizePlanKey(currentShop?.plan)] || PLANS.free;

        await db.shop.update({
          where: { shopDomain: shop.shopDomain },
          data: { addonActive: false, addonSubscriptionId: null },
        });

        await enforceProductLimit(shop.shopDomain, planConfig.maxProducts);
        console.info("[stripe] addon canceled", { shopDomain: shop.shopDomain });
      } else {
        // Main plan canceled: downgrade to free
        await db.shop.update({
          where: { shopDomain: shop.shopDomain },
          data: {
            stripeSubscriptionId: null,
            stripeStatus: "canceled",
            currentPeriodEnd: null,
          },
        });

        await setShopPlan(shop.shopDomain, "free");
        await enforceProductLimit(shop.shopDomain, PLANS.free.maxProducts);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId) {
        await db.shop.updateMany({
          where: { stripeCustomerId: customerId },
          data: { stripeStatus: "past_due" },
        });
      }
      break;
    }

    default:
      break;
  }

  return { received: true, type: event.type };
}
