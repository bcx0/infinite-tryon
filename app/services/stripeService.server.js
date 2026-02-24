import Stripe from "stripe";
import { PLANS } from "../config/plans";
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

  return entry ? entry[0] : "free";
}

function dateFromStripeTimestamp(unixSeconds) {
  if (!unixSeconds || typeof unixSeconds !== "number") {
    return null;
  }

  return new Date(unixSeconds * 1000);
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
      const planKey = normalizePlanKey(session.metadata?.planKey);
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      if (shopDomain && subscriptionId) {
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

      if (customerId) {
        const firstItem = subscription.items?.data?.[0];
        const planKey = planFromStripePriceId(firstItem?.price?.id);
        const periodEnd = dateFromStripeTimestamp(subscription.current_period_end);
        const shop = await db.shop.findFirst({
          where: { stripeCustomerId: customerId },
          select: { shopDomain: true },
        });

        if (shop?.shopDomain) {
          await db.shop.update({
            where: { shopDomain: shop.shopDomain },
            data: {
              stripeSubscriptionId: subscription.id,
              stripeStatus: subscription.status,
              currentPeriodEnd: periodEnd,
            },
          });

          await setShopPlan(shop.shopDomain, planKey);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (customerId) {
        const shop = await db.shop.findFirst({
          where: { stripeCustomerId: customerId },
          select: { shopDomain: true },
        });

        if (shop?.shopDomain) {
          await db.shop.update({
            where: { shopDomain: shop.shopDomain },
            data: {
              stripeSubscriptionId: null,
              stripeStatus: "canceled",
              currentPeriodEnd: null,
            },
          });

          await setShopPlan(shop.shopDomain, "free");
        }
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
