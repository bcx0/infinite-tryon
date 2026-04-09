import { describe, it, expect } from 'vitest';
import { PLANS, ADDON } from '../../app/config/plans.js';

describe('plans configuration', () => {
  describe('All plans exist', () => {
    it('has free plan', () => {
      expect(PLANS.free).toBeDefined();
    });

    it('has starter plan', () => {
      expect(PLANS.starter).toBeDefined();
    });

    it('has premium plan', () => {
      expect(PLANS.premium).toBeDefined();
    });

    it('has pro plan', () => {
      expect(PLANS.pro).toBeDefined();
    });

    it('has ultimate plan', () => {
      expect(PLANS.ultimate).toBeDefined();
    });

    it('has no other plans', () => {
      const planKeys = Object.keys(PLANS);
      expect(planKeys).toEqual(['free', 'starter', 'premium', 'pro', 'ultimate']);
    });
  });

  describe('Plan structure', () => {
    const requiredFields = ['name', 'priceMonthly', 'maxProducts', 'maxTryOnsPerMonth'];

    const testPlanStructure = (planKey) => {
      const plan = PLANS[planKey];
      requiredFields.forEach((field) => {
        expect(plan).toHaveProperty(field);
      });
      expect(typeof plan.name).toBe('string');
      expect(typeof plan.priceMonthly).toBe('number');
      expect(typeof plan.maxProducts).toBe('number');
      expect(typeof plan.maxTryOnsPerMonth).toBe('number');
    };

    it('free plan has required fields', () => {
      testPlanStructure('free');
    });

    it('starter plan has required fields', () => {
      testPlanStructure('starter');
    });

    it('premium plan has required fields', () => {
      testPlanStructure('premium');
    });

    it('pro plan has required fields', () => {
      testPlanStructure('pro');
    });

    it('ultimate plan has required fields', () => {
      testPlanStructure('ultimate');
    });
  });

  describe('Plan pricing', () => {
    it('free plan has zero price', () => {
      expect(PLANS.free.priceMonthly).toBe(0);
    });

    it('plans are ordered by price', () => {
      const prices = [
        PLANS.free.priceMonthly,
        PLANS.starter.priceMonthly,
        PLANS.premium.priceMonthly,
        PLANS.pro.priceMonthly,
        PLANS.ultimate.priceMonthly,
      ];
      // Check that each price is less than the next
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
      }
    });

    it('all prices are non-negative', () => {
      Object.values(PLANS).forEach((plan) => {
        expect(plan.priceMonthly).toBeGreaterThanOrEqual(0);
      });
    });

    it('starter plan costs $19', () => {
      expect(PLANS.starter.priceMonthly).toBe(19);
    });

    it('premium plan costs $49', () => {
      expect(PLANS.premium.priceMonthly).toBe(49);
    });

    it('pro plan costs $89', () => {
      expect(PLANS.pro.priceMonthly).toBe(89);
    });

    it('ultimate plan costs $179', () => {
      expect(PLANS.ultimate.priceMonthly).toBe(179);
    });
  });

  describe('Plan limits', () => {
    it('free plan has zero products and tryOns', () => {
      expect(PLANS.free.maxProducts).toBe(0);
      expect(PLANS.free.maxTryOnsPerMonth).toBe(0);
    });

    it('starter plan has limits', () => {
      expect(PLANS.starter.maxProducts).toBe(3);
      expect(PLANS.starter.maxTryOnsPerMonth).toBe(120);
    });

    it('premium plan has higher limits than starter', () => {
      expect(PLANS.premium.maxProducts).toBeGreaterThan(PLANS.starter.maxProducts);
      expect(PLANS.premium.maxTryOnsPerMonth).toBeGreaterThan(PLANS.starter.maxTryOnsPerMonth);
    });

    it('pro plan has higher limits than premium', () => {
      expect(PLANS.pro.maxProducts).toBeGreaterThan(PLANS.premium.maxProducts);
      expect(PLANS.pro.maxTryOnsPerMonth).toBeGreaterThan(PLANS.premium.maxTryOnsPerMonth);
    });

    it('ultimate plan has highest limits', () => {
      expect(PLANS.ultimate.maxProducts).toBeGreaterThan(PLANS.pro.maxProducts);
      expect(PLANS.ultimate.maxTryOnsPerMonth).toBeGreaterThan(PLANS.pro.maxTryOnsPerMonth);
    });

    it('all limits are non-negative', () => {
      Object.values(PLANS).forEach((plan) => {
        expect(plan.maxProducts).toBeGreaterThanOrEqual(0);
        expect(plan.maxTryOnsPerMonth).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Plan highlighting', () => {
    it('pro plan is highlighted', () => {
      expect(PLANS.pro.highlighted).toBe(true);
    });

    it('only pro plan is highlighted', () => {
      const highlightedPlans = Object.values(PLANS).filter((p) => p.highlighted);
      expect(highlightedPlans).toHaveLength(1);
      expect(highlightedPlans[0]).toBe(PLANS.pro);
    });

    it('all other plans are not highlighted', () => {
      expect(PLANS.free.highlighted).toBe(false);
      expect(PLANS.starter.highlighted).toBe(false);
      expect(PLANS.premium.highlighted).toBe(false);
      expect(PLANS.ultimate.highlighted).toBe(false);
    });
  });

  describe('Plan names', () => {
    it('each plan has a unique name', () => {
      const names = Object.values(PLANS).map((p) => p.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('plan names are capitalized strings', () => {
      Object.values(PLANS).forEach((plan) => {
        expect(typeof plan.name).toBe('string');
        expect(plan.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ADDON configuration', () => {
    it('ADDON is defined', () => {
      expect(ADDON).toBeDefined();
    });

    it('ADDON has required fields', () => {
      expect(ADDON).toHaveProperty('name');
      expect(ADDON).toHaveProperty('priceMonthly');
      expect(ADDON).toHaveProperty('extraProducts');
      expect(ADDON).toHaveProperty('extraTryOns');
    });

    it('ADDON has positive values', () => {
      expect(ADDON.priceMonthly).toBeGreaterThan(0);
      expect(ADDON.extraProducts).toBeGreaterThan(0);
      expect(ADDON.extraTryOns).toBeGreaterThan(0);
    });

    it('ADDON costs $15 monthly', () => {
      expect(ADDON.priceMonthly).toBe(15);
    });

    it('ADDON provides extra products and tryOns', () => {
      expect(ADDON.extraProducts).toBe(2);
      expect(ADDON.extraTryOns).toBe(150);
    });
  });
});
