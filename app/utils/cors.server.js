/**
 * CORS utility for handling cross-origin requests from Shopify storefronts
 * to the infinite-tryon backend API.
 */

/**
 * Check if an origin matches known Shopify domain patterns
 * @param {string} origin - The origin to check
 * @returns {boolean} True if the origin is a known Shopify domain
 */
function isShopifyOrigin(origin) {
  if (!origin) return false;

  const shopifyPatterns = [
    /^https?:\/\/[a-zA-Z0-9-]+\.myshopify\.com$/,
    /^https?:\/\/[a-zA-Z0-9-]+\.shopify\.com$/,
    /^https?:\/\/[a-zA-Z0-9-]+\.shopifypreview\.com$/,
    /^https?:\/\/[a-zA-Z0-9-]+(-[a-zA-Z0-9]+)*\.shopifypreview\.com$/,
  ];

  return shopifyPatterns.some((pattern) => pattern.test(origin));
}

/**
 * Check if an origin is allowed.
 * We allow:
 * 1. Known Shopify domains (*.myshopify.com, *.shopify.com, *.shopifypreview.com)
 * 2. Localhost for development
 * 3. Any HTTPS origin that provides a valid x-shop-domain header
 *    (custom domains are validated server-side via session check)
 *
 * @param {string} origin - The origin to check
 * @param {Request} request - The incoming request
 * @returns {boolean} True if the origin is allowed
 */
function isOriginAllowed(origin, request) {
  if (!origin) return false;

  // Allow localhost for development
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return true;
  }

  // Always allow known Shopify domains
  if (isShopifyOrigin(origin)) {
    return true;
  }

  // Allow custom domains if they provide a x-shop-domain header
  // (the actual session validation happens in the route handler)
  const shopDomain = request.headers.get("x-shop-domain");
  if (shopDomain && origin.startsWith("https://")) {
    return true;
  }

  return false;
}

/**
 * Generate CORS headers for cross-origin requests
 * @param {Request} request - The incoming request object
 * @returns {Object} Headers object with CORS headers
 */
export function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allowed = isOriginAllowed(origin, request);

  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-shop-domain",
    "Access-Control-Max-Age": "86400",
  };

  // Only reflect the origin if allowed (never use *)
  if (allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
}
