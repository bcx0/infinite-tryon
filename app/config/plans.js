// free is an internal tombstone — assigned on subscription cancelation.
// Not shown on the pricing page. Grants zero usable features.
export const PLANS = {
  free: {
    name: "Free",
    priceMonthly: 0,
    maxProducts: 0,
    maxTryOnsPerMonth: 0,
    highlighted: false,
  },
  starter: {
    name: "Starter",
    priceMonthly: 19,
    maxProducts: 3,
    maxTryOnsPerMonth: 120,
    highlighted: false,
  },
  premium: {
    name: "Premium",
    priceMonthly: 49,
    maxProducts: 8,
    maxTryOnsPerMonth: 300,
    highlighted: false,
  },
  pro: {
    name: "Pro",
    priceMonthly: 89,
    maxProducts: 20,
    maxTryOnsPerMonth: 550,
    highlighted: true,
  },
  ultimate: {
    name: "Ultimate",
    priceMonthly: 179,
    maxProducts: 999,
    maxTryOnsPerMonth: 1100,
    highlighted: false,
  },
};

// Addon temporarily disabled during Shopify Billing migration.
// Will be re-enabled via Shopify usage-based billing later.
export const ADDON = {
  name: "Addon",
  priceMonthly: 15,
  extraProducts: 2,
  extraTryOns: 150,
};
