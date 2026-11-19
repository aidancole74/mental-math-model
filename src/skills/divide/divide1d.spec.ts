import { describe, expect, it } from 'vitest';
import { chunks, divideByChunks } from './divide1d';

describe('divideByChunks', () => {
  it('matches n ÷ d for every exact division with a quotient up to 1999', () => {
    for (let d = 2; d <= 9; d++) {
      for (let q = 1; q <= 1999; q++) expect(divideByChunks(q * d, d), q * d + ' ÷ ' + d).toBe(q);
    }
  });

  it('takes the biggest round chunk first and ends with nothing left', () => {
    expect(chunks(1764, 7)).toEqual([
      { count: 200, take: 1400, left: 364 },
      { count: 50, take: 350, left: 14 },
      { count: 2, take: 14, left: 0 },
    ]);
  });
});
