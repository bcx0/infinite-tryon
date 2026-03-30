import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { setShopPlan } from "../services/shopService.server";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const url = new URL(request.url);
  const planKey = url.searchParams.get("plan");

  if (planKey) {
    // Verify the payment was actually confirmed by Shopify
    const hasPayment = await billing.check({
      plans: [planKey],
      isTest: process.env.NODE_ENV !== "production",
    });

    if (hasPayment) {
      await setShopPlan(shopDomain, planKey);
    }
  }

  return redirect("/app?checkout=success");
};

// Remix requires a default export for route modules.
// This route always redirects server-side, so the component is never rendered.
export default function BillingCallbackRedirect() {
  return null;
}
