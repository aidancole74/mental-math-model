import { describe, expect, it } from 'vitest';
import { oneFigure, productRounding, quotientPlan, sqrtEstimate, tenPercentWhole } from './estimates';

describe('oneFigure', () => {
  it('rounds to a single non-zero digit either way', () => {
    expect(oneFigure(47, 'down')).toBe(40);
    expect(oneFigure(47, 'up')).toBe(50);
    expect(oneFigure(349, 'up')).toBe(400);
    expect(oneFigure(4000, 'up')).toBe(4000);
    for (let x = 1; x <= 9999; x++) {
      const down = oneFigure(x, 'down');
      const up = oneFigure(x, 'up');
      expect(down).toBeLessThanOrEqual(x);
      expect(up).toBeGreaterThanOrEqual(x);
      expect(String(down).replace(/0+$/, '').length).toBe(1);
    }
  });
});

describe('productRounding', () => {
  it('is never further off than plain nearest rounding', () => {
    for (let a = 12; a <= 99; a++) {
      for (let b = 12; b <= 99; b++) {
        const { ra, rb } = productRounding(a, b);
        const near = (x: number): number => (x - oneFigure(x, 'down') < oneFigure(x, 'up') - x ? oneFigure(x, 'down') : oneFigure(x, 'up'));
        expect(Math.abs(ra * rb - a * b)).toBeLessThanOrEqual(Math.abs(near(a) * near(b) - a * b));
      }
    }
  });
});

describe('quotientPlan', () => {
  it('lands within 10% whenever it offers a plan, and uses a neat division', () => {
    let planned = 0;
    for (let a = 1001; a <= 9999; a += 13) {
      for (let b = 12; b <= 99; b++) {
        const plan = quotientPlan(a, b);
        if (!plan) continue;
        planned++;
        expect(plan.ra / plan.rb).toBe(plan.q);
        expect(Math.abs(plan.q - a / b)).toBeLessThanOrEqual(Math.round(a / b * 10) / 100 + 0.01);
      }
    }
    expect(planned).toBeGreaterThan(50000);
  });
});

describe('sqrtEstimate', () => {
  it('lands within 2% of the true root for every non-square from 11 to 9999', () => {
    for (let n = 11; n <= 9999; n++) {
      if (Number.isInteger(Math.sqrt(n))) continue;
      const { est } = sqrtEstimate(n);
      expect(Math.abs(est - Math.sqrt(n)) / Math.sqrt(n), String(n)).toBeLessThan(0.02);
    }
  });

  it('picks the nearest square, above or below', () => {
    expect(sqrtEstimate(70)).toMatchObject({ s: 8, diff: 6, est: 8.4 });
    expect(sqrtEstimate(78)).toMatchObject({ s: 9, diff: -3, est: 8.8 });
  });
});

describe('tenPercentWhole', () => {
  it('is a whole number no bigger than 10%', () => {
    expect(tenPercentWhole(3901)).toBe(390);
    expect(tenPercentWhole(5)).toBe(1);
  });
});
