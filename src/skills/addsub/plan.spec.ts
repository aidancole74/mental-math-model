import { describe, expect, it } from 'vitest';
import { additionPlan, finalValue, subtractionPlan } from './plan';

describe('additionPlan', () => {
  it('matches plain addition for every 2- and 3-digit pair (sampled)', () => {
    for (let a = 10; a <= 999; a += 7) {
      for (let b = 1; b <= 999; b++) {
        expect(finalValue(a, additionPlan(a, b)), a + ' + ' + b).toBe(a + b);
      }
    }
  });

  it('adds the biggest piece first', () => {
    const moves = additionPlan(538, 347);
    expect(moves.map((m) => m.amount)).toEqual([300, 40, 7]);
    expect(moves.map((m) => m.after)).toEqual([838, 878, 885]);
  });

  it('skips zero places', () => {
    expect(additionPlan(50, 207).map((m) => m.role)).toEqual(['hundreds', 'ones']);
  });
});

describe('subtractionPlan', () => {
  it('matches plain subtraction for every b < 1000 and a > b (sampled)', () => {
    for (let b = 1; b <= 999; b++) {
      for (let a = b + 1; a <= 1100; a += 13) {
        expect(finalValue(a, subtractionPlan(a, b)), a + ' − ' + b).toBe(a - b);
      }
    }
  });

  it('never goes below zero part way through', () => {
    for (let b = 1; b <= 999; b++) {
      for (let a = b + 10; a <= 1100; a += 11) {
        for (const m of subtractionPlan(a, b)) expect(m.after, a + ' − ' + b).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('rounds up and gives back when the last digit is 7, 8 or 9', () => {
    const moves = subtractionPlan(83, 47);
    expect(moves.map((m) => [m.op, m.amount, m.after])).toEqual([
      ['−', 50, 33],
      ['+', 3, 36],
    ]);
  });

  it('rounds 97 up to 100', () => {
    expect(subtractionPlan(723, 497).map((m) => m.after)).toEqual([323, 223, 226]);
  });

  it('goes piece by piece when the last digit is small', () => {
    expect(subtractionPlan(85, 23).map((m) => m.role)).toEqual(['tens', 'ones']);
  });
});
