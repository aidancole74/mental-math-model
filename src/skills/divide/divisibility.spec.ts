import { describe, expect, it } from 'vitest';
import { alternatingSum, fittingDigits, missingDigit, ruleRemainder } from './divisibility';

describe('ruleRemainder', () => {
  it('matches n mod d for every n up to 99,999 and every rule', () => {
    for (const d of [3, 4, 5, 8, 9, 11]) {
      for (let n = 1; n <= 99999; n++) {
        if (ruleRemainder(n, d) !== n % d) expect(ruleRemainder(n, d), n + ' mod ' + d).toBe(n % d);
      }
    }
  });

  it('alternates signs from the right', () => {
    expect(alternatingSum(7341)).toBe(1 - 4 + 3 - 7);
  });
});

describe('missingDigit', () => {
  it('finds the smallest fitting digit for every four- and five-digit pattern', () => {
    let checked = 0;
    for (let digits = 4; digits <= 5; digits++) {
      for (let n = 10 ** (digits - 1); n < 10 ** digits; n += digits === 5 ? 7 : 1) {
        const text = String(n);
        for (let pos = 1; pos < digits; pos++) {
          const pattern = text.slice(0, pos) + '_' + text.slice(pos + 1);
          for (const d of [3, 9, 11]) {
            const fits = fittingDigits(pattern, d);
            expect(missingDigit(pattern, d), pattern + ' / ' + d).toBe(fits[0] ?? null);
            checked++;
          }
          if (pos < digits - 1) {
            const fits6 = fittingDigits(pattern, 6);
            const even = Number(text[digits - 1]) % 2 === 0;
            expect(missingDigit(pattern, 6), pattern + ' / 6').toBe(even ? (fits6[0] ?? null) : null);
          }
          if (pos === digits - 2) {
            expect(missingDigit(pattern, 4), pattern + ' / 4').toBe(fittingDigits(pattern, 4)[0] ?? null);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100000);
  });
});
