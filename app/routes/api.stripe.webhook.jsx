import { json } from "@remix-run/node";
import { handleWebhookEvent } from "../services/stripeService.server";
import logger from "../utils/logger.server";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const result = await handleWebhookEvent(rawBody, signature);
    logger.info("stripe webhook processed", { type: result.type });
    return json({ received: true }, { status: 200 });
  } catch (error) {
    logger.error("stripe webhook error", { error: error.message });
    return json(
      { received: true, error: error.message || "Webhook handling failed" },
      { status: 200 },
    );
  }
};
