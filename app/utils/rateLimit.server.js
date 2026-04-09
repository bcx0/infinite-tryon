import db from "../db.server";

/**
 * DB-based rate limiter. Persists across server restarts.
 * Uses upsert to atomically check and increment.
 */
export async function checkRateLimit(key, maxRequests, windowMs) {
  const now = new Date();

  // Try to find existing record
  let record = await db.rateLimit.findUnique({ where: { key } });

  if (!record || now.getTime() - record.windowStart.getTime() >= windowMs) {
    // Window expired or no record — reset
    record = await db.rateLimit.upsert({
      where: { key },
      update: { count: 1, windowStart: now },
      create: { key, count: 1, windowStart: now },
    });
    return { limited: false };
  }

  if (record.count >= maxRequests) {
    const retryAfterMs = windowMs - (now.getTime() - record.windowStart.getTime());
    return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  // Increment count
  await db.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return { limited: false };
}
