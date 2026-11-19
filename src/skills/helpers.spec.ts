import { describe, expect, it } from 'vitest';
import { dec, digitsOf, money, num, round2, spokenMoney, spokenMoneyAdj, sumDigits } from './helpers';
import { createRng } from './rng';

describe('num', () => {
  it('groups thousands', () => {
    expect(num(7)).toBe('7');
    expect(num(1234)).toBe('1,234');
    expect(num(1234567)).toBe('1,234,567');
  });

  it('keeps decimals and signs intact', () => {
    expect(num(1234.5)).toBe('1,234.5');
    expect(num(-1234)).toBe('-1,234');
  });
});

describe('money', () => {
  it('drops cents when there are none', () => {
    expect(money(64)).toBe('$64');
    expect(money(1200)).toBe('$1,200');
  });

  it('always shows two decimals when there are cents', () => {
    expect(money(63.4)).toBe('$63.40');
    expect(money(9.05)).toBe('$9.05');
  });
});

describe('spokenMoney', () => {
  it('reads dollars and cents as words', () => {
    expect(spokenMoney(64)).toBe('64 dollars');
    expect(spokenMoney(1)).toBe('1 dollar');
    expect(spokenMoney(63.4)).toBe('63 dollars and 40 cents');
    expect(spokenMoney(5.01)).toBe('5 dollars and 1 cent');
  });
});

describe('spokenMoneyAdj', () => {
  it('uses the adjective form for whole dollars', () => {
    expect(spokenMoneyAdj(90)).toBe('90-dollar');
  });

  it('falls back to the noun form when there are cents', () => {
    expect(spokenMoneyAdj(84.6)).toBe('84 dollars and 60 cents');
  });
});

describe('round2 and dec', () => {
  it('clears float dust', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(15 * 0.07)).toBe(1.05);
    expect(dec(9.0)).toBe('9');
    expect(dec(9.6)).toBe('9.6');
  });
});

describe('digits', () => {
  it('splits and sums digits', () => {
    expect(digitsOf(352)).toEqual([3, 5, 2]);
    expect(digitsOf(7)).toEqual([7]);
    expect(sumDigits(352)).toBe(10);
  });
});

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const left = Array.from({ length: 20 }, () => a.int(0, 1000));
    const right = Array.from({ length: 20 }, () => b.int(0, 1000));
    expect(left).toEqual(right);
  });

  it('differs between seeds', () => {
    const a = Array.from({ length: 20 }, (_, i) => createRng(i).int(0, 1_000_000));
    expect(new Set(a).size).toBeGreaterThan(15);
  });

  it('stays inside the requested range, inclusive', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = rng.int(3, 8);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(8);
      seen.add(v);
    }
    expect(seen.size).toBe(6); // both ends actually reachable
  });

  it('shuffles without losing or duplicating items', () => {
    const rng = createRng(9);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = rng.shuffled(input);
    expect(out.slice().sort((x, y) => x - y)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
  });
});
