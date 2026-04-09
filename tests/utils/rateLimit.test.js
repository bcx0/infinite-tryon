import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit } from '../../app/utils/rateLimit.server.js';

// Mock the database module
vi.mock('../../app/db.server.js', () => {
  const mockDb = {
    rateLimit: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  };
  return { default: mockDb };
});

import db from '../../app/db.server.js';

describe('rateLimit - checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('New rate limit window', () => {
    it('creates new record and returns limited: false', async () => {
      const now = new Date();
      db.rateLimit.findUnique.mockResolvedValueOnce(null);
      db.rateLimit.upsert.mockResolvedValueOnce({
        key: 'test-key',
        count: 1,
        windowStart: now,
      });

      const result = await checkRateLimit('test-key', 5, 60000);

      expect(result.limited).toBe(false);
      expect(db.rateLimit.findUnique).toHaveBeenCalledWith({ where: { key: 'test-key' } });
      expect(db.rateLimit.upsert).toHaveBeenCalled();
    });

    it('resets count when window expired', async () => {
      const now = new Date();
      const oldWindowStart = new Date(now.getTime() - 120000); // 2 minutes ago
      db.rateLimit.findUnique.mockResolvedValueOnce({
        key: 'test-key',
        count: 10,
        windowStart: oldWindowStart,
      });
      db.rateLimit.upsert.mockResolvedValueOnce({
        key: 'test-key',
        count: 1,
        windowStart: now,
      });

      const result = await checkRateLimit('test-key', 5, 60000);

      expect(result.limited).toBe(false);
      expect(db.rateLimit.upsert).toHaveBeenCalled();
    });
  });

  describe('Within rate limit', () => {
    it('increments count and returns limited: false', async () => {
      const now = new Date();
      db.rateLimit.findUnique.mockResolvedValueOnce({
        key: 'test-key',
        count: 2,
        windowStart: now,
      });
      db.rateLimit.update.mockResolvedValueOnce({
        key: 'test-key',
        count: 3,
        windowStart: now,
      });

      const result = await checkRateLimit('test-key', 5, 60000);

      expect(result.limited).toBe(false);
      expect(db.rateLimit.update).toHaveBeenCalledWith({
        where: { key: 'test-key' },
        data: { count: { increment: 1 } },
      });
    });

    it('allows requests under max limit', async () => {
      const now = new Date();
      db.rateLimit.findUnique.mockResolvedValueOnce({
        key: 'test-key',
        count: 1,
        windowStart: now,
      });
      db.rateLimit.update.mockResolvedValueOnce({
        key: 'test-key',
        count: 2,
        windowStart: now,
      });

      const result = await checkRateLimit('test-key', 100, 60000);

      expect(result.limited).toBe(false);
    });
  });

  describe('Rate limit exceeded', () => {
    it('returns limited: true when max requests reached', async () => {
      const now = new Date();
      db.rateLimit.findUnique.mockResolvedValueOnce({
        key: 'test-key',
        count: 5,
        windowStart: now,
      });

      const result = await checkRateLimit('test-key', 5, 60000);

      expect(result.limited).toBe(true);
      expect(result.retryAfterSeconds).toBeDefined();
    });

    it('calculates correct retryAfterSeconds', async () => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 30000); // 30 seconds ago
      const windowMs = 60000; // 60 second window
      db.rateLimit.findUnique.mockResolvedValueOnce({
        key: 'test-key',
        count: 5,
        windowStart,
      });

      const result = await checkRateLimit('test-key', 5, windowMs);

      expect(result.limited).toBe(true);
      expect(result.retryAfterSeconds).toBe(30); // 60 - 30 = 30 seconds
    });

    it('ensures retryAfterSeconds is at least 1', async () => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 59999); // almost window expired
      db.rateLimit.findUnique.mockResolvedValueOnce({
        key: 'test-key',
        count: 5,
        windowStart,
      });

      const result = await checkRateLimit('test-key', 5, 60000);

      expect(result.limited).toBe(true);
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });

    it('does not increment count when rate limited', async () => {
      const now = new Date();
      db.rateLimit.findUnique.mockResolvedValueOnce({
        key: 'test-key',
        count: 5,
        windowStart: now,
      });

      await checkRateLimit('test-key', 5, 60000);

      expect(db.rateLimit.update).not.toHaveBeenCalled();
    });
  });

  describe('Different keys', () => {
    it('tracks separate rate limits for different keys', async () => {
      const now = new Date();

      db.rateLimit.findUnique.mockResolvedValueOnce({
        key: 'key-1',
        count: 2,
        windowStart: now,
      });
      db.rateLimit.update.mockResolvedValueOnce({
        key: 'key-1',
        count: 3,
        windowStart: now,
      });

      const result1 = await checkRateLimit('key-1', 5, 60000);
      expect(result1.limited).toBe(false);

      db.rateLimit.findUnique.mockResolvedValueOnce({
        key: 'key-2',
        count: 5,
        windowStart: now,
      });

      const result2 = await checkRateLimit('key-2', 5, 60000);
      expect(result2.limited).toBe(true);

      expect(db.rateLimit.findUnique).toHaveBeenCalledWith({ where: { key: 'key-1' } });
      expect(db.rateLimit.findUnique).toHaveBeenCalledWith({ where: { key: 'key-2' } });
    });
  });
});
