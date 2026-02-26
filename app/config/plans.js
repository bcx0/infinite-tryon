export const PLANS = {
  free: {
    name: "Free",
    priceMonthly: 0,
    stripePriceId: null,
    maxProducts: 1,
    maxTryOnsPerMonth: 10,
  },
  starter: {
    name: "Starter",
    priceMonthly: 19,
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
    maxProducts: 3,
    maxTryOnsPerMonth: 200,
  },
  premium: {
    name: "Premium",
    priceMonthly: 49,
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM,
    maxProducts: 5,
    maxTryOnsPerMonth: 400,
  },
  pro: {
    name: "Pro",
    priceMonthly: 59,
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    maxProducts: 15,
    maxTryOnsPerMonth: 1000,
  },
  ultimate: {
    name: "Ultimate",
    priceMonthly: 119,
    stripePriceId: process.env.STRIPE_PRICE_ULTIMATE,
    maxProducts: 999,
    maxTryOnsPerMonth: 3000,
  },
};

export const ADDON = {
  name: "Addon",
  priceMonthly: 15,
  stripePriceId: process.env.STRIPE_PRICE_ADDON,
  extraTryOns: 150,
  extraProducts: 2,
};
