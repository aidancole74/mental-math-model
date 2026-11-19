import { describe, expect, it } from 'vitest';
import { complement, countUpChange, partnerDigits } from './complements';

describe('complement', () => {
  it('matches 100 − n for every n from 1 to 99 not ending in 0', () => {
    for (let n = 1; n < 100; n++) if (n % 10) expect(complement(n, 100), '100 − ' + n).toBe(100 - n);
  });

  it('matches 1000 − n for every n from 1 to 999 not ending in 0', () => {
    for (let n = 1; n < 1000; n++) if (n % 10) expect(complement(n, 1000), '1000 − ' + n).toBe(1000 - n);
  });

  it('pairs digits to 9 and the last to 10', () => {
    expect(partnerDigits(638, 1000)).toEqual([3, 6, 2]);
    expect(partnerDigits(38, 1000)).toEqual([9, 6, 2]);
    expect(partnerDigits(7, 100)).toEqual([9, 3]);
  });
});

describe('countUpChange', () => {
  it('matches pay − price, to the cent, for every price the generator can make', () => {
    for (const pay of [10, 20, 50, 100]) {
      for (let dollars = 1; dollars <= pay - 2; dollars++) {
        for (let cents = 1; cents < 100; cents++) {
          if (cents % 10 === 0) continue;
          const price = (dollars * 100 + cents) / 100;
          const expected = (pay * 100 - (dollars * 100 + cents)) / 100;
          expect(countUpChange(pay, price).change, pay + ' − ' + price).toBe(expected);
        }
      }
    }
  });

  it('counts up through the next dollar', () => {
    expect(countUpChange(20, 13.47)).toEqual({ cents: 53, nextDollar: 14, dollars: 6, change: 6.53 });
  });
});
