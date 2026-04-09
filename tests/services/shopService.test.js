import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizePlanKey, getPlanConfig, getEffectivePlanKey } from '../../app/services/shopService.server.js';
import { PLANS } from '../../app/config/plans.js';

describe('shopService', () => {
  describe('normalizePlanKey', () => {
    it('returns "free" for null input', () => {
      expect(normalizePlanKey(null)).toBe('free');
    });

    it('returns "free" for undefined input', () => {
      expect(normalizePlanKey(undefined)).toBe('free');
    });

    it('returns "free" for empty string', () => {
      expect(normalizePlanKey('')).toBe('free');
    });

    it('returns "free" for whitespace string', () => {
      expect(normalizePlanKey('   ')).toBe('free');
    });

    it('returns "free" for invalid plan key', () => {
      expect(normalizePlanKey('nonexistent')).toBe('free');
    });

    it('returns "free" for non-string input', () => {
      expect(normalizePlanKey(123)).toBe('free');
      expect(normalizePlanKey({})).toBe('free');
      expect(normalizePlanKey([])).toBe('free');
    });

    it('returns lowercase plan key for valid plans', () => {
      expect(normalizePlanKey('STARTER')).toBe('starter');
      expect(normalizePlanKey('Premium')).toBe('premium');
      expect(normalizePlanKey('PRO')).toBe('pro');
      expect(normalizePlanKey('Ultimate')).toBe('ultimate');
      expect(normalizePlanKey('FREE')).toBe('free');
    });

    it('handles whitespace around valid plan keys', () => {
      expect(normalizePlanKey('  starter  ')).toBe('starter');
      expect(normalizePlanKey('\n  premium  \n')).toBe('premium');
    });
  });

  describe('getPlanConfig', () => {
    it('returns correct config for each plan', () => {
      expect(getPlanConfig('free')).toEqual(PLANS.free);
      expect(getPlanConfig('starter')).toEqual(PLANS.starter);
      expect(getPlanConfig('premium')).toEqual(PLANS.premium);
      expect(getPlanConfig('pro')).toEqual(PLANS.pro);
      expect(getPlanConfig('ultimate')).toEqual(PLANS.ultimate);
    });

    it('returns free plan config for invalid plan keys', () => {
      expect(getPlanConfig('nonexistent')).toEqual(PLANS.free);
      expect(getPlanConfig(null)).toEqual(PLANS.free);
      expect(getPlanConfig('')).toEqual(PLANS.free);
    });

    it('returns config with all required fields', () => {
      const config = getPlanConfig('starter');
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('priceMonthly');
      expect(config).toHaveProperty('maxProducts');
      expect(config).toHaveProperty('maxTryOnsPerMonth');
    });

    it('handles case-insensitive plan keys', () => {
      expect(getPlanConfig('STARTER')).toEqual(PLANS.starter);
      expect(getPlanConfig('PrEmIuM')).toEqual(PLANS.premium);
    });
  });

  describe('getEffectivePlanKey', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns "free" when shop plan is "free" and no active trial', () => {
      const shop = {
        plan: 'free',
        trialEndsAt: new Date(Date.now() - 1000), // expired trial
      };
      expect(getEffectivePlanKey(shop)).toBe('free');
    });

    it('returns "free" when shop plan is "free" and trial end is null', () => {
      const shop = {
        plan: 'free',
        trialEndsAt: null,
      };
      expect(getEffectivePlanKey(shop)).toBe('free');
    });

    it('returns "starter" when shop plan is "free" but has active trial', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day in future
      const shop = {
        plan: 'free',
        trialEndsAt: futureDate,
      };
      expect(getEffectivePlanKey(shop)).toBe('starter');
    });

    it('returns the actual plan when not "free"', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const shop = {
        plan: 'premium',
        trialEndsAt: futureDate,
      };
      expect(getEffectivePlanKey(shop)).toBe('premium');
    });

    it('normalizes invalid plan keys before checking trial', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const shop = {
        plan: 'INVALID_PLAN',
        trialEndsAt: futureDate,
      };
      // Invalid plan normalizes to "free", trial is active, so returns "starter"
      expect(getEffectivePlanKey(shop)).toBe('starter');
    });

    it('handles trial expiration edge cases', () => {
      // Trial expires now (not in future)
      const now = new Date();
      const shop = {
        plan: 'free',
        trialEndsAt: now,
      };
      expect(getEffectivePlanKey(shop)).toBe('free');
    });

    it('handles string date values', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const shop = {
        plan: 'free',
        trialEndsAt: futureDate.toISOString(),
      };
      expect(getEffectivePlanKey(shop)).toBe('starter');
    });
  });
});
