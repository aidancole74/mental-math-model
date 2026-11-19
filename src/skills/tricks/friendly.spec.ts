import { describe, expect, it } from 'vitest';
import { timesFriendly, type Friendly } from './friendly';

describe('timesFriendly', () => {
  it('matches plain multiplication for every operand up to 9999', () => {
    for (const m of [9, 5, 25] as Friendly[]) {
      for (let a = 1; a <= 9999; a++) {
        expect(timesFriendly(a, m), a + ' × ' + m).toBe(a * m);
      }
    }
  });

  it('handles the textbook cases', () => {
    expect(timesFriendly(47, 9)).toBe(423);
    expect(timesFriendly(48, 5)).toBe(240);
    expect(timesFriendly(47, 5)).toBe(235);
    expect(timesFriendly(36, 25)).toBe(900);
    expect(timesFriendly(47, 25)).toBe(1175);
  });
});
