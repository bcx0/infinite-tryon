/**
 * Stripe setup script — Infinite Tryon
 *
 * Creates all products and recurring prices in Stripe, then prints the
 * environment variable names and values to copy into Railway.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/setup-stripe.mjs
 *
 * Safe to re-run: each product is looked up by name before being created,
 * so running twice will not create duplicates.
 */

import Stripe from "stripe";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SECRET_KEY) {
  console.error("Error: STRIPE_SECRET_KEY environment variable is not set.");
  console.error("Usage: STRIPE_SECRET_KEY=sk_live_... node scripts/setup-stripe.mjs");
  process.exit(1);
}

const stripe = new Stripe(SECRET_KEY);

const PLANS = [
  {
    envKey: "STRIPE_PRICE_STARTER",
    productName: "Infinite Tryon — Starter",
    description: "3 products with virtual try-on · up to 300 try-ons/month",
    amountCents: 1900,
  },
  {
    envKey: "STRIPE_PRICE_PREMIUM",
    productName: "Infinite Tryon — Premium",
    description: "8 products with virtual try-on · up to 800 try-ons/month",
    amountCents: 4900,
  },
  {
    envKey: "STRIPE_PRICE_PRO",
    productName: "Infinite Tryon — Pro",
    description: "20 products with virtual try-on · up to 2000 try-ons/month",
    amountCents: 8900,
  },
  {
    envKey: "STRIPE_PRICE_ULTIMATE",
    productName: "Infinite Tryon — Ultimate",
    description: "Unlimited products with virtual try-on · up to 5000 try-ons/month",
    amountCents: 17900,
  },
  {
    envKey: "STRIPE_PRICE_ADDON",
    productName: "Infinite Tryon — Add-on Produits",
    description: "+2 extra products · +150 extra try-ons/month",
    amountCents: 1500,
  },
];

async function findExistingProduct(name) {
  const products = await stripe.products.list({ limit: 100, active: true });
  return products.data.find((p) => p.name === name) || null;
}

async function findExistingPrice(productId, amountCents) {
  const prices = await stripe.prices.list({ product: productId, limit: 10, active: true });
  return (
    prices.data.find(
      (p) => p.unit_amount === amountCents && p.recurring?.interval === "month",
    ) || null
  );
}

async function main() {
  const mode = SECRET_KEY.startsWith("sk_live") ? "LIVE" : "TEST";
  console.log(`\nStripe setup — Infinite Tryon (${mode} mode)\n${"─".repeat(50)}`);

  const results = {};

  for (const plan of PLANS) {
    process.stdout.write(`${plan.productName} ... `);

    let product = await findExistingProduct(plan.productName);
    if (!product) {
      product = await stripe.products.create({
        name: plan.productName,
        description: plan.description,
      });
    }

    let price = await findExistingPrice(product.id, plan.amountCents);
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amountCents,
        currency: "eur",
        recurring: { interval: "month" },
      });
    }

    results[plan.envKey] = price.id;
    console.log(`${price.id}${price.created ? "" : " (existing)"}`);
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log("Copy these into your Railway environment variables:\n");
  for (const [key, value] of Object.entries(results)) {
    console.log(`${key}=${value}`);
  }
  console.log(`\n${"─".repeat(50)}`);
  console.log("Done. Do not forget to register your Stripe webhook endpoint:");
  console.log(
    "  https://infinite-tryon-production-b5cf.up.railway.app/api/stripe/webhook",
  );
  console.log(
    "  Events: checkout.session.completed, customer.subscription.updated,",
  );
  console.log(
    "          customer.subscription.deleted, invoice.payment_failed\n",
  );
}

main().catch((err) => {
  console.error("\nSetup failed:", err.message);
  process.exit(1);
});
