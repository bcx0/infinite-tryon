import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const shop = await db.shop.findUnique({
    where: { shopDomain },
    select: { plan: true, boostEnabled: true },
  });

  if (!shop || shop.plan === "free") {
    return json({ error: "Boost requires an active plan" }, { status: 403 });
  }

  const newState = !shop.boostEnabled;

  await db.shop.update({
    where: { shopDomain },
    data: { boostEnabled: newState },
  });

  return json({ boostEnabled: newState });
};

export default function BoostToggle() {
  return null;
}
