import { authenticate } from "../shopify.server";

/**
 * GDPR mandatory webhook: customers/data_request
 * Shopify requests a report of all customer data the app has stored.
 * This app does not store personal customer data (name, email, etc.) —
 * only anonymous try-on logs linked to a shop domain.
 * Return 200 to acknowledge receipt; no data export is required.
 */
export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);

  // This app stores no customer PII — only shop-level session data and
  // anonymous try-on logs. There is no customer-specific data to report.
  console.log(`[GDPR] customers/data_request acknowledged for shop: ${shop}`, {
    customerId: payload?.customer?.id,
    customerEmail: payload?.customer?.email,
  });

  return new Response(null, { status: 200 });
};
