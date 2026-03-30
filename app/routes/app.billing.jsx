import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { setShopPlan } from "../services/shopService.server";

export const loader = async ({ request }) => {
  const VALID_PLANS = ["starter", "premium", "pro", "ultimate"];

  const { billing, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const url = new URL(request.url);
  const planKey = url.searchParams.get("plan");

  if (!planKey || !VALID_PLANS.includes(planKey)) {
    return redirect("/app");
  }

  // Check if the shop already has an active subscription for this plan
  const hasPayment = await billing.check({
    plans: [planKey],
    isTest: process.env.NODE_ENV !== "production",
  });

  if (hasPayment) {
    // Already subscribed to this plan — update DB and redirect
    await setShopPlan(shopDomain, planKey);
    return redirect("/app?checkout=success");
  }

  // Create the subscription via Shopify Billing API
  // billing.request() automatically redirects the merchant to Shopify's payment page
  await billing.request({
    plan: planKey,
    isTest: process.env.NODE_ENV !== "production",
    returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing/callback?plan=${planKey}`,
  });

  // billing.request() throws a redirect response, so this line is never reached
  return null;
};

// Remix requires a default export for route modules.
// This route always redirects server-side, so the component is never rendered.
export default function BillingRedirect() {
  return null;
}
