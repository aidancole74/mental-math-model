import { describe, expect, it } from 'vitest';
import { fractionToDecimal, repeatingDigits } from './fracDecimal';

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

describe('fractionToDecimal', () => {
  it('matches num ÷ den, rounded to 3 places, for every fraction the skill can ask', () => {
    for (const den of [4, 5, 20, 25, 50, 3, 6, 7, 9, 11]) {
      for (let num = 1; num < den; num++) {
        if (den === 6 && num !== 1 && num !== 5) continue; // other sixths reduce
        if (den === 3 || den === 9 || den === 11 || den === 7 || den === 6 || 100 % den === 0) {
          expect(fractionToDecimal(num, den), num + '/' + den).toBe(round3(num / den));
        }
      }
    }
    for (let num = 1; num <= 31; num++) expect(fractionToDecimal(num, 8), num + '/8').toBe(num / 8);
  });

  it('reads the repeating patterns', () => {
    expect(repeatingDigits(5, 7, 6)).toBe('714285');
    expect(repeatingDigits(5, 11, 6)).toBe('454545');
    expect(repeatingDigits(2, 3, 4)).toBe('6666');
    expect(repeatingDigits(5, 6, 4)).toBe('8333');
  });

  it('matches the true expansion digit for digit', () => {
    for (const den of [3, 7, 9, 11]) {
      for (let num = 1; num < den; num++) {
        const digits = repeatingDigits(num, den, 10);
        // Long division, digit by digit.
        let r = num;
        let truth = '';
        for (let i = 0; i < 10; i++) {
          r *= 10;
          truth += Math.floor(r / den);
          r %= den;
        }
        expect(digits, num + '/' + den).toBe(truth);
      }
    }
  });
});
