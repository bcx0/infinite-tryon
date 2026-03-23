import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createAddonCheckoutSession } from "../services/stripeService.server";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const auth = await authenticate.admin(request);
  const shopDomain = String(auth?.session?.shop || "").trim().toLowerCase();

  if (!shopDomain) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const returnBaseUrl = String(payload?.returnBaseUrl || "").trim();
  if (!returnBaseUrl) {
    return json({ error: "returnBaseUrl is required" }, { status: 400 });
  }

  try {
    const session = await createAddonCheckoutSession(shopDomain, returnBaseUrl);
    return json({ checkoutUrl: session.url });
  } catch (error) {
    const message = error?.message || "Failed to create addon checkout session";

    if (message.includes("already active")) {
      return json({ error: message }, { status: 409 });
    }

    if (message.includes("No Stripe customer")) {
      return json({ error: "A paid plan is required before adding the add-on" }, { status: 402 });
    }

    console.error("[addon-checkout] error", { shopDomain, error: message });
    return json({ error: message }, { status: 500 });
  }
};
