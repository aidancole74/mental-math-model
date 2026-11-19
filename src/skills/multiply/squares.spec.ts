import { describe, expect, it } from 'vitest';
import { closePair, smallSquare, squarePlan } from './squares';

describe('squarePlan', () => {
  it('squares every two-digit number around the nearest ten', () => {
    for (let a = 10; a <= 99; a++) {
      if (a % 10 === 5) continue; // halfway: that is the ends-in-5 trick
      const p = squarePlan(a, 10);
      expect(p.answer, a + '²').toBe(a * a);
      expect(p.d, a + ' distance').toBeLessThanOrEqual(4);
      expect(p.round % 10).toBe(0);
    }
  });

  it('squares every three-digit number within 49 of a hundred', () => {
    for (let a = 100; a <= 999; a++) {
      if (a % 100 === 50) continue;
      const p = squarePlan(a, 100);
      expect(p.answer, a + '²').toBe(a * a);
      expect(p.d).toBeLessThanOrEqual(49);
      expect(p.round % 100).toBe(0);
    }
  });

  it('handles the textbook cases', () => {
    expect(squarePlan(47, 10)).toMatchObject({ round: 50, other: 44, d: 3, product: 2200, answer: 2209 });
    expect(squarePlan(343, 100)).toMatchObject({ round: 300, other: 386, d: 43, product: 115800, answer: 117649 });
  });
});

describe('smallSquare', () => {
  it('matches d × d for 0 to 99', () => {
    for (let d = 0; d <= 99; d++) expect(smallSquare(d), d + '²').toBe(d * d);
  });
});

describe('closePair', () => {
  it('matches a × b for every pair evenly around a multiple of 5 up to 125', () => {
    for (let mid = 10; mid <= 125; mid += 5) {
      for (let gap = 1; gap <= 9; gap++) {
        const a = mid - gap;
        const b = mid + gap;
        expect(closePair(a, b).answer, a + ' × ' + b).toBe(a * b);
        expect(closePair(b, a).answer, b + ' × ' + a).toBe(a * b);
      }
    }
  });
});
