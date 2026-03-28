import { json } from "@remix-run/node";
import db from "../db.server";
import { corsHeaders } from "../utils/cors.server";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(request) });
  }
  let payload;
  try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(request) }); }
  if (payload?.secret !== "infinite-admin-2026") {
    return json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  }
  const shop = payload?.shop;
  const plan = payload?.plan;
  if (!shop || !plan) {
    return json({ error: "shop and plan are required" }, { status: 400, headers: corsHeaders(request) });
  }
  try {
    const updated = await db.shop.updateMany({
      where: { shopDomain: shop.trim().toLowerCase() },
      data: { plan: plan.trim().toLowerCase() },
    });
    if (updated.count === 0) {
      return json({ error: "Shop not found", shop }, { status: 404, headers: corsHeaders(request) });
    }
    return json({ success: true, shop, plan, updated: updated.count }, { headers: corsHeaders(request) });
  } catch (error) {
    return json({ error: error.message }, { status: 500, headers: corsHeaders(request) });
  }
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  return json({ error: "Method not allowed" }, { status: 405 });
};
