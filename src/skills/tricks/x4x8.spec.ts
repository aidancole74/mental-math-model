import { describe, expect, it } from 'vitest';
import { doublings, timesByDoubling, type Doubler } from './x4x8';

describe('timesByDoubling', () => {
  it('matches plain multiplication for every operand up to 9999', () => {
    for (const m of [4, 8] as Doubler[]) {
      for (let a = 1; a <= 9999; a++) expect(timesByDoubling(a, m), a + ' × ' + m).toBe(a * m);
    }
  });

  it('doubles twice for 4 and three times for 8', () => {
    expect(doublings(37, 4)).toEqual([37, 74, 148]);
    expect(doublings(37, 8)).toEqual([37, 74, 148, 296]);
  });
});
