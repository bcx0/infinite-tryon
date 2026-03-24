import { json } from "@remix-run/node";
import db from "../db.server";

// Lightweight healthcheck used by Railway to determine instance readiness.
// Always returns HTTP 200 so Railway marks the instance as healthy once the
// server is up. The `db` field in the body lets us monitor database health
// separately without blocking deployment.
export const loader = async () => {
  const start = Date.now();
  let dbStatus = "ok";
  let dbError = null;

  try {
    const dbCheck = db.$queryRaw`SELECT 1`;
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("db check timed out after 5s")), 5000),
    );
    await Promise.race([dbCheck, timeout]);
  } catch (error) {
    dbStatus = "error";
    dbError = error?.message || "unknown error";
    console.error("[health] db check failed:", dbError);
  }

  return json(
    {
      status: "ok",
      db: dbStatus,
      ...(dbError ? { db_error: dbError } : {}),
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
};
