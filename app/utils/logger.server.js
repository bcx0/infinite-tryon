/**
 * Structured JSON logger for Railway / stdout log aggregation.
 *
 * Usage:
 *   import logger from "../utils/logger.server";
 *   logger.info("stripe webhook received", { type: event.type });
 *   logger.error("checkout failed", { shopDomain, error: err.message });
 */

function log(level, message, context = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...context,
  };

  const line = JSON.stringify(entry);

  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

const logger = {
  info: (message, context) => log("info", message, context),
  warn: (message, context) => log("warn", message, context),
  error: (message, context) => log("error", message, context),
  debug: (message, context) => {
    if (process.env.LOG_LEVEL === "debug") {
      log("debug", message, context);
    }
  },
};

export default logger;
