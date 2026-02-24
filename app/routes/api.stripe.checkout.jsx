import { json } from "@remix-run/node";
import { createCheckoutSession } from "../services/stripeService.server";

const ALLOWED_PLAN_KEYS = new Set(["starter", "growth", "pro"]);

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
      { error: "planKey must be one of starter, growth, pro" },
      { status: 400 },
    );
  }

  if (!shopDomain) {
    return json({ error: "shopDomain is required" }, { status: 400 });
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
