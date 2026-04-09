import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { markNotificationRead, markAllRead } from "../services/notifications.server";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const auth = await authenticate.admin(request);
  const shopDomain = String(
    auth?.session?.shop || request.headers.get("x-shop-domain") || "",
  )
    .trim()
    .toLowerCase();

  if (!shopDomain) {
    throw json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const notificationId = url.searchParams.get("id");

  try {
    if (action === "mark_read" && notificationId) {
      await markNotificationRead(shopDomain, notificationId);
      return json({ success: true, message: "Notification marked as read" });
    }

    if (action === "mark_all_read") {
      await markAllRead(shopDomain);
      return json({ success: true, message: "All notifications marked as read" });
    }

    return json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Notification action failed:", error);
    return json({ error: error.message || "Failed to process notification" }, { status: 500 });
  }
};
