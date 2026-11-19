import { describe, expect, it } from 'vitest';
import { factorPair, leftToRight, multPlan, placeParts, timesOneDigit } from './products';

describe('timesOneDigit', () => {
  it('matches a × b for every a up to 9999 and b from 1 to 9', () => {
    for (let a = 1; a <= 9999; a++) for (let b = 1; b <= 9; b++) expect(timesOneDigit(a, b)).toBe(a * b);
  });

  it('keeps a running total, biggest part first', () => {
    expect(placeParts(407)).toEqual([400, 7]);
    expect(leftToRight(468, 7)).toEqual([
      { part: 400, product: 2800, total: 2800 },
      { part: 60, product: 420, total: 3220 },
      { part: 8, product: 56, total: 3276 },
    ]);
  });
});

describe('factorPair', () => {
  it('finds one-digit factors whenever they exist, closest together', () => {
    for (let b = 10; b <= 99; b++) {
      const pair = factorPair(b);
      let exists = false;
      for (let x = 2; x <= 9; x++) if (b % x === 0 && b / x >= 2 && b / x <= 9) exists = true;
      expect(pair !== null, String(b)).toBe(exists);
      if (pair) {
        expect(pair[0] * pair[1]).toBe(b);
        expect(pair[0]).toBeLessThanOrEqual(pair[1]);
      }
    }
    expect(factorPair(24)).toEqual([4, 6]);
    expect(factorPair(42)).toEqual([6, 7]);
  });
});

describe('multPlan', () => {
  it('matches a × b by every method that applies, for all a up to 999 and b up to 99', () => {
    for (let a = 10; a <= 999; a++) {
      for (let b = 12; b <= 99; b++) {
        if (b % 10 === 0) continue;
        expect(multPlan(a, b, 'add').answer).toBe(a * b);
        if (b % 10 >= 8) expect(multPlan(a, b, 'subtract').answer).toBe(a * b);
        if (factorPair(b)) expect(multPlan(a, b, 'factor').answer).toBe(a * b);
      }
    }
  });

  it('refuses to factor a number with no one-digit factors', () => {
    expect(() => multPlan(47, 23, 'factor')).toThrow();
  });
});
