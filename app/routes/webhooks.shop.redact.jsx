import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR mandatory webhook: shop/redact
 * Shopify requests deletion of all shop data 48 hours after a shop uninstalls the app.
 * Delete all data associated with the shop.
 */
export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[GDPR] Received ${topic} webhook for ${shop}`);

  const shopDomain = (payload?.shop_domain || shop || "").toLowerCase().trim();

  if (!shopDomain) {
    console.warn("[GDPR] shop/redact: missing shopDomain, skipping");
    return new Response(null, { status: 200 });
  }

  try {
    // Delete all data linked to this shop in dependency order.
    // TryOnLog and Product cascade from Shop via onDelete: Cascade,
    // but we delete sessions separately as they live in a different model.
    await db.$transaction([
      db.session.deleteMany({ where: { shop: shopDomain } }),
      db.shop.deleteMany({ where: { shopDomain } }),
    ]);

    console.log(`[GDPR] shop/redact: all data deleted for shop ${shopDomain}`);
  } catch (error) {
    // Log the error but return 200 — Shopify will not retry GDPR webhooks.
    console.error(`[GDPR] shop/redact error for ${shopDomain}:`, error);
  }

  return new Response(null, { status: 200 });
};
