import { describe, expect, it } from 'vitest';
import { makeProblem } from '../registry';
import { pctBasics, percentByBlocks, type BasicPct } from './pctBasics';

describe('percentByBlocks', () => {
  it('matches pct × base / 100 for every whole base up to 2000', () => {
    for (const pct of [10, 5, 15] as BasicPct[]) {
      for (let base = 1; base <= 2000; base++) {
        expect(percentByBlocks(pct, base), pct + '% of ' + base).toBeCloseTo((pct * base) / 100, 10);
      }
    }
  });

  it('handles the textbook tip', () => {
    expect(percentByBlocks(15, 64)).toBe(9.6);
    expect(percentByBlocks(15, 487)).toBe(73.05);
  });
});

describe('pct-basics problems', () => {
  it('mixes plain drills and real-world contexts', () => {
    const problems = Array.from({ length: 200 }, (_, i) => makeProblem(pctBasics, 2, i + 1));
    const contexts = problems.filter((p) => p.answerKind === 'money').length;
    expect(contexts).toBeGreaterThan(50);
    expect(contexts).toBeLessThan(150);
  });

  it('serves all three percentages', () => {
    const pcts = new Set(Array.from({ length: 100 }, (_, i) => makeProblem(pctBasics, 1, i + 1).meta.pct));
    expect(pcts).toEqual(new Set([10, 5, 15]));
  });

  it('never gives the answer away in a 10% hint', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const p = makeProblem(pctBasics, 2, seed);
      if (p.meta.pct === 10) expect(pctBasics.hint(p)).toMatch(/move the decimal/i);
    }
  });

  it('reads money and percent signs as words', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const p = makeProblem(pctBasics, 3, seed);
      if (p.answerKind === 'money') {
        expect(p.spoken).toMatch(/dollar/);
        expect(p.spoken).toMatch(/percent/);
      }
    }
  });
});
