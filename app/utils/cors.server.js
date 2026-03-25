/**
 * CORS utility for handling cross-origin requests from Shopify storefronts
 * to the infinite-tryon backend API.
 */

/**
 * Generate CORS headers for cross-origin requests
 * @param {Request} request - The incoming request object
 * @returns {Object} Headers object with CORS headers
 */
export function corsHeaders(request) {
    return {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-shop-domain",
          "Access-Control-Max-Age": "86400",
    };
}
