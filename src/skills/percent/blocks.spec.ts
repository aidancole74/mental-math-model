import { describe, expect, it } from 'vitest';
import { round2 } from '../helpers';
import { PLANS, percentOf } from './blocks';
import { estimatePercent } from './estimatePct';
import { article, friendly, phrase, m, n } from './phrase';

describe('percentOf (block plans)', () => {
  it('every plan adds up to its percentage', () => {
    for (const [p, plan] of Object.entries(PLANS)) {
      const total = plan.reduce((s, [c, b]) => s + c * Number(b), 0);
      expect(total, p + '%').toBe(Number(p));
    }
  });

  it('matches p × x / 100 for every plan and every whole x up to 2000', () => {
    for (const p of Object.keys(PLANS).map(Number)) {
      for (let x = 1; x <= 2000; x++) {
        expect(percentOf(p, x).value, p + '% of ' + x).toBe(round2((p * x) / 100));
      }
    }
  });

  it('ends its walkthrough on the answer and hints without it', () => {
    const w = percentOf(35, 84);
    expect(w.value).toBe(29.4);
    expect(w.steps.map((s) => s.text)).toEqual([
      '10% of 84: move the decimal point one place left → 8.4.',
      '5% is half of 10%: 8.4 ÷ 2 = 4.2.',
      '35% = 3 × 10% + 5%: 25.2 + 4.2 = 29.4.',
    ]);
    expect(w.hint).not.toContain('29.4');
  });

  it('reads subtraction plans naturally', () => {
    expect(percentOf(18, 50).steps.at(-1)?.text).toBe('18% = 20% − 2 × 1%: 10 − 1 = 9.');
    expect(percentOf(90, 70).steps.at(-1)?.text).toBe('90% = all of it − 10%: 70 − 7 = 63.');
  });
});

describe('estimatePercent', () => {
  it('lands within 1 percentage point for everything from 5% to 100%', () => {
    for (let whole = 20; whole <= 500; whole += 7) {
      for (let part = Math.ceil(whole * 0.05); part <= whole; part += 3) {
        const exact = (part / whole) * 100;
        expect(Math.abs(estimatePercent(part, whole).estimate - exact), part + ' of ' + whole).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('phrase', () => {
  it('builds matching prompt and speech, with adjective money before nouns', () => {
    expect(phrase('A {price-} jacket is {pct}% off. Pay {price}?', { price: m(84), pct: n(30) })).toEqual({
      prompt: 'A $84 jacket is 30% off. Pay $84?',
      spoken: 'A 84-dollar jacket is 30 percent off. Pay 84 dollars?',
    });
  });

  it('picks a or an by how the number sounds', () => {
    expect([8, 18, 11, 80, 85, 841, 8000, 11000, 18500].map(article)).toEqual(Array(9).fill('an'));
    expect([1, 10, 15, 20, 100, 110, 180, 1100, 1800, 2.5].map(article)).toEqual(Array(10).fill('a'));
    expect(phrase('{An:x} {x-} coat, {an:p} {p}% tip.', { x: m(841), p: n(18) })).toEqual({
      prompt: 'An $841 coat, an 18% tip.',
      spoken: 'An 841-dollar coat, an 18 percent tip.',
    });
  });

  it('rounds to friendly numbers', () => {
    expect(friendly(83.47)).toBe(85);
    expect(friendly(12.6)).toBe(13);
    expect(friendly(198)).toBe(200);
    expect(friendly(1240)).toBe(1200);
  });
});
