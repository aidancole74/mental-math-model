import { describe, expect, it } from 'vitest';
import { squareEndingIn5 } from './square5';

describe('squareEndingIn5', () => {
  it('matches plain squaring for every number ending in 5 up to 9995', () => {
    for (let n = 5; n <= 9995; n += 10) {
      expect(squareEndingIn5(n), String(n)).toBe(n * n);
    }
  });

  it('handles the textbook cases', () => {
    expect(squareEndingIn5(35)).toBe(1225);
    expect(squareEndingIn5(95)).toBe(9025);
    expect(squareEndingIn5(115)).toBe(13225);
  });
});
