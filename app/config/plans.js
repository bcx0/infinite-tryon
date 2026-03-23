// free is kept as an internal fallback plan (not shown on the pricing page).
// It is assigned automatically when a subscription is canceled.
export const PLANS = {
  free: {
    name: "Free",
    priceMonthly: 0,
    stripePriceId: null,
    maxProducts: 1,
    maxTryOnsPerMonth: 10,
    highlighted: false,
  },
  starter: {
    name: "Starter",
    priceMonthly: 19,
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
    maxProducts: 3,
    maxTryOnsPerMonth: 300,
    highlighted: false,
  },
  premium: {
    name: "Premium",
    priceMonthly: 49,
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM,
    maxProducts: 8,
    maxTryOnsPerMonth: 800,
    highlighted: false,
  },
  pro: {
    name: "Pro",
    priceMonthly: 89,
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    maxProducts: 20,
    maxTryOnsPerMonth: 2000,
    highlighted: true,
  },
  ultimate: {
    name: "Ultimate",
    priceMonthly: 179,
    stripePriceId: process.env.STRIPE_PRICE_ULTIMATE,
    maxProducts: 999,
    maxTryOnsPerMonth: 5000,
    highlighted: false,
  },
};

export const ADDON = {
  name: "Addon",
  priceMonthly: 15,
  stripePriceId: process.env.STRIPE_PRICE_ADDON,
  extraProducts: 2,
  extraTryOns: 150,
};
