import { json } from "@remix-run/node";
import { createPortalSession } from "../services/stripeService.server";

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

  const shopDomain = String(payload?.shopDomain || "").trim().toLowerCase();
  if (!shopDomain) {
    return json({ error: "shopDomain is required" }, { status: 400 });
  }

  const url = new URL(request.url);
  const returnUrl = String(payload?.returnUrl || `${url.origin}/app`);

  try {
    const portal = await createPortalSession(shopDomain, returnUrl);
    return json({ portalUrl: portal.url });
  } catch (error) {
    return json(
      { error: error.message || "Unable to create portal session" },
      { status: 500 },
    );
  }
};
