import { describe, it, expect } from 'vitest';
import { corsHeaders } from '../../app/utils/cors.server.js';

// Helper to create a mock Request object
function createMockRequest(origin, shopDomain = null) {
  return {
    headers: new Map([
      ['origin', origin],
      ...(shopDomain ? [['x-shop-domain', shopDomain]] : []),
    ]),
  };
}

describe('corsHeaders', () => {
  describe('Shopify origins', () => {
    it('allows myshopify.com origins', () => {
      const request = createMockRequest('https://mystore.myshopify.com');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://mystore.myshopify.com');
      expect(headers['Vary']).toBe('Origin');
    });

    it('allows shopify.com origins', () => {
      const request = createMockRequest('https://mystore.shopify.com');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://mystore.shopify.com');
    });

    it('allows shopifypreview.com origins', () => {
      const request = createMockRequest('https://mystore.shopifypreview.com');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://mystore.shopifypreview.com');
    });

    it('allows shopifypreview.com origins with hyphens', () => {
      const request = createMockRequest('https://my-store-1.shopifypreview.com');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://my-store-1.shopifypreview.com');
    });

    it('allows http shopify origins', () => {
      const request = createMockRequest('http://mystore.myshopify.com');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBe('http://mystore.myshopify.com');
    });
  });

  describe('localhost origins', () => {
    it('allows localhost with http', () => {
      const request = createMockRequest('http://localhost:3000');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(headers['Vary']).toBe('Origin');
    });

    it('allows localhost with https', () => {
      const request = createMockRequest('https://localhost:3000');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://localhost:3000');
    });

    it('allows 127.0.0.1', () => {
      const request = createMockRequest('http://127.0.0.1:3000');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBe('http://127.0.0.1:3000');
    });
  });

  describe('custom domains with x-shop-domain header', () => {
    it('allows HTTPS origins with x-shop-domain header', () => {
      const request = createMockRequest('https://example.com', 'mystore.myshopify.com');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Vary']).toBe('Origin');
    });

    it('blocks HTTP origins even with x-shop-domain header', () => {
      const request = createMockRequest('http://example.com', 'mystore.myshopify.com');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(headers['Vary']).toBeUndefined();
    });

    it('blocks HTTPS origins without x-shop-domain header', () => {
      const request = createMockRequest('https://example.com');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(headers['Vary']).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles missing origin header', () => {
      const request = {
        headers: new Map([['x-shop-domain', 'mystore.myshopify.com']]),
      };
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(headers['Vary']).toBeUndefined();
    });

    it('blocks random origins without credentials', () => {
      const request = createMockRequest('https://random-domain.com');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(headers['Vary']).toBeUndefined();
    });

    it('always includes standard CORS headers', () => {
      const request = createMockRequest('http://localhost:3000');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, x-shop-domain');
      expect(headers['Access-Control-Max-Age']).toBe('86400');
    });

    it('includes Vary: Origin header when origin is allowed', () => {
      const request = createMockRequest('https://mystore.myshopify.com');
      const headers = corsHeaders(request);
      expect(headers['Vary']).toBe('Origin');
    });

    it('never uses wildcard origin', () => {
      const request = createMockRequest('https://example.com', 'mystore.myshopify.com');
      const headers = corsHeaders(request);
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });
  });
});
