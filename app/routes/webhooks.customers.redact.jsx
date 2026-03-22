import { authenticate } from "../shopify.server";

/**
 * GDPR mandatory webhook: customers/redact
 * Shopify requests deletion of customer data 10 days after a customer
 * requests their data be erased from a store.
 */
export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);

  // The payload contains customer_id and shop_domain.
  // This app stores TryOnLog records linked to a shopDomain, not to individual
  // customers, so there is no customer-specific PII to delete.
  // If you add customer-linked data in the future, delete it here.

  const shopDomain = payload?.shop_domain || shop;

  console.log(`[GDPR] customers/redact processed for shop: ${shopDomain}`, {
    customerId: payload?.customer?.id,
    customerEmail: payload?.customer?.email,
  });

  return new Response(null, { status: 200 });
};
