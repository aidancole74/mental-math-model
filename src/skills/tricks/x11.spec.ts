import { describe, expect, it } from 'vitest';
import { carryNotes, elevenTimes, x11 } from './x11';
import { makeProblem } from '../registry';

describe('elevenTimes', () => {
  it('matches plain multiplication for every 2-, 3- and 4-digit number', () => {
    for (let a = 10; a <= 9999; a++) {
      expect(elevenTimes(a), String(a)).toBe(a * 11);
    }
  });

  it('handles the textbook cases', () => {
    expect(elevenTimes(43)).toBe(473); // no carry
    expect(elevenTimes(68)).toBe(748); // carry out of the middle
    expect(elevenTimes(99)).toBe(1089); // carry all the way out
    expect(elevenTimes(352)).toBe(3872); // three digits, no carry
    expect(elevenTimes(999)).toBe(10989); // three digits, cascading carries
  });
});

describe('carryNotes', () => {
  it('shows each carry on the actual numbers', () => {
    // 675 × 11 -> 6 | 13 | 12 | 5
    expect(carryNotes([6, 13, 12, 5])).toEqual([
      '12 → keep 2, carry 1',
      '13 + 1 = 14 → keep 4, carry 1',
      '6 + 1 = 7',
    ]);
  });

  it('writes a two-digit front slot in full', () => {
    // 999 × 11 -> 9 | 18 | 18 | 9 -> 10989
    expect(carryNotes([9, 18, 18, 9])).toEqual([
      '18 → keep 8, carry 1',
      '18 + 1 = 19 → keep 9, carry 1',
      '9 + 1 = 10',
    ]);
  });
});

describe('x11 walkthrough', () => {
  it('spells out the carry when there is one', () => {
    const problem = makeProblem(x11, 2, 7);
    const text = x11
      .solve(problem)
      .map((s) => s.text)
      .join(' ');
    expect(text.toLowerCase()).toContain('carry');
  });

  it('does not mention carrying when there is none', () => {
    const problem = makeProblem(x11, 1, 7);
    const text = x11
      .solve(problem)
      .map((s) => s.text)
      .join(' ');
    expect(text.toLowerCase()).not.toContain('carry');
  });
});
