export const PLANS = {
  free: {
    name: "Free",
    priceMonthly: 0,
    stripePriceId: null,
    maxProducts: 3,
    maxTryOnsPerMonth: 50,
  },
  starter: {
    name: "Starter",
    priceMonthly: 49,
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
    maxProducts: 10,
    maxTryOnsPerMonth: 500,
  },
  growth: {
    name: "Growth",
    priceMonthly: 149,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH,
    maxProducts: 50,
    maxTryOnsPerMonth: 2000,
  },
  pro: {
    name: "Pro",
    priceMonthly: 349,
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    maxProducts: 999,
    maxTryOnsPerMonth: 10000,
  },
};
