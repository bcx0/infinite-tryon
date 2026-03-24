import { json } from "@remix-run/node";
import db from "../db.server";
import logger from "../utils/logger.server";

// Lightweight healthcheck used by Railway to determine instance readiness.
// Tests the database connection — if this fails, the instance is unhealthy.
export const loader = async () => {
  const start = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;

    return json(
      {
        status: "ok",
        db: "ok",
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    logger.error("health db check failed", { error: error?.message });

    return json(
      {
        status: "error",
        db: "error",
        message: error?.message || "Database unreachable",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
};
