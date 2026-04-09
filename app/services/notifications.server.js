import db from "../db.server";

function assertShopDomain(shopDomain) {
  if (!shopDomain || typeof shopDomain !== "string" || !shopDomain.trim()) {
    throw new Error("shopDomain is required");
  }
  return shopDomain.trim().toLowerCase();
}

/**
 * Create a new notification for a shop
 */
export async function createNotification(shopDomain, type, message) {
  const normalizedShopDomain = assertShopDomain(shopDomain);

  return db.notification.create({
    data: {
      shopDomain: normalizedShopDomain,
      type: String(type || "").trim().toLowerCase(),
      message: String(message || "").trim(),
    },
  });
}

/**
 * Get all unread notifications for a shop
 */
export async function getUnreadNotifications(shopDomain) {
  const normalizedShopDomain = assertShopDomain(shopDomain);

  return db.notification.findMany({
    where: {
      shopDomain: normalizedShopDomain,
      isRead: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(shopDomain, notificationId) {
  const normalizedShopDomain = assertShopDomain(shopDomain);

  return db.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
    },
  });
}

/**
 * Mark all notifications as read for a shop
 */
export async function markAllRead(shopDomain) {
  const normalizedShopDomain = assertShopDomain(shopDomain);

  return db.notification.updateMany({
    where: {
      shopDomain: normalizedShopDomain,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

/**
 * Check if a notification of a certain type already exists this month
 */
export async function hasNotificationThisMonth(shopDomain, notificationType) {
  const normalizedShopDomain = assertShopDomain(shopDomain);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const count = await db.notification.count({
    where: {
      shopDomain: normalizedShopDomain,
      type: String(notificationType || "").trim().toLowerCase(),
      createdAt: {
        gte: monthStart,
        lt: monthEnd,
      },
    },
  });

  return count > 0;
}

/**
 * Get notifications grouped by type for a shop
 */
export async function getNotificationsByType(shopDomain) {
  const normalizedShopDomain = assertShopDomain(shopDomain);

  const notifications = await db.notification.findMany({
    where: {
      shopDomain: normalizedShopDomain,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const grouped = {};
  for (const notif of notifications) {
    if (!grouped[notif.type]) {
      grouped[notif.type] = [];
    }
    grouped[notif.type].push(notif);
  }

  return grouped;
}
