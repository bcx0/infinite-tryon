import { json } from "@remix-run/node";
import { createCheckoutSession } from "../services/stripeService.server";
import db from "../db.server";

const ALLOWED_PLAN_KEYS = new Set(["starter", "premium", "pro", "ultimate"]);

// 5 checkout attempts per shop per hour — prevents session spam
const CHECKOUT_RATE_LIMIT_MAX = 5;
const CHECKOUT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const checkoutRateLimit = new Map();

function checkAndIncrementCheckoutRateLimit(shopDomain) {
  const now = Date.now();
  const current = checkoutRateLimit.get(shopDomain);

  if (!current || now - current.windowStart >= CHECKOUT_RATE_LIMIT_WINDOW_MS) {
    checkoutRateLimit.set(shopDomain, { count: 1, windowStart: now });
    return { limited: false };
  }

  if (current.count >= CHECKOUT_RATE_LIMIT_MAX) {
    const retryAfterMs = CHECKOUT_RATE_LIMIT_WINDOW_MS - (now - current.windowStart);
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  current.count += 1;
  return { limited: false };
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

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const planKey = String(payload?.planKey || "").trim().toLowerCase();
  const shopDomain = String(payload?.shopDomain || "").trim().toLowerCase();

  if (!ALLOWED_PLAN_KEYS.has(planKey)) {
    return json(
      { error: "planKey must be one of starter, premium, pro, ultimate" },
      { status: 400 },
    );
  }

  if (!shopDomain) {
    return json({ error: "shopDomain is required" }, { status: 400 });
  }

  const validSession = await hasValidSessionForShop(shopDomain);
  if (!validSession) {
    return json({ error: "Unauthorized: no active session for this shop" }, { status: 401 });
  }

  const rateLimit = checkAndIncrementCheckoutRateLimit(shopDomain);
  if (rateLimit.limited) {
    return json(
      {
        error: "Too many checkout attempts. Please wait before trying again.",
        retry_after_seconds: rateLimit.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const returnBaseUrl = String(payload?.returnBaseUrl || `${url.origin}/app`);

  try {
    const session = await createCheckoutSession(shopDomain, planKey, returnBaseUrl);
    return json({ checkoutUrl: session.url });
  } catch (error) {
    return json(
      { error: error.message || "Unable to create checkout session" },
      { status: 500 },
    );
  }
};
