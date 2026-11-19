import { defineSkill } from '../define';
import { dec, metaNum, money, num, round2 } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';
import { m, n, phrase } from './phrase';

/**
 * 10%, 5% and 15% — the first percentage building blocks.
 * meta: { pct, base, ctx } — pct is 10, 5 or 15; ctx indexes CONTEXTS[pct],
 * or is -1 for a plain "15% of 64" drill.
 */

export type BasicPct = 10 | 5 | 15;

interface Context {
  /** Template for phrase(): {x} / {x-} = the amount, {p} = the percent, {an:x} = its article. */
  template: string;
  /** Closing line; {A} = the answer as money. */
  closing: string;
}

export const CONTEXTS: Record<BasicPct, Context[]> = {
  10: [
    { template: '{An:x} {x-} jacket is {p}% off. How much do you save?', closing: 'So you save {A}.' },
    { template: 'You save {p}% of {an:x} {x-} paycheck. How much is that?', closing: 'So you put away {A}.' },
  ],
  5: [
    { template: 'Sales tax is {p}% on {an:x} {x-} purchase. How much is the tax?', closing: 'So the tax is {A}.' },
    { template: '{An:x} {x-} order gets a {p}% member discount. How much do you save?', closing: 'So you save {A}.' },
  ],
  15: [
    { template: 'Dinner comes to {x}. What is a {p}% tip?', closing: 'So the tip is {A}.' },
    { template: '{An:x} {x-} pair of shoes is {p}% off. How much do you save?', closing: 'So you save {A}.' },
  ],
};

/** The building-block way: 10% by shifting, 5% by halving, 15% by adding. */
export function percentByBlocks(pct: BasicPct, base: number): number {
  const ten = base / 10;
  const five = ten / 2;
  return round2(pct === 10 ? ten : pct === 5 ? five : ten + five);
}

function pickBase(difficulty: Difficulty, pct: BasicPct, rng: Rng): number {
  if (difficulty === 1) {
    // Whole-number answers: multiples of 10 for 10%, multiples of 20 otherwise.
    return pct === 10 ? rng.int(2, 30) * 10 : rng.int(2, 20) * 20;
  }
  if (difficulty === 2) return rng.int(21, 199);
  return rng.int(100, 999);
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  const pct: BasicPct =
    difficulty === 3 ? rng.pick<BasicPct>([15, 15, 5, 10]) : rng.pick<BasicPct>([10, 5, 15]);
  const base = pickBase(difficulty, pct, rng);
  const useContext = rng.chance(difficulty === 3 ? 0.7 : 0.5);
  const answer = percentByBlocks(pct, base);

  if (!useContext) {
    return {
      prompt: pct + '% of ' + num(base),
      spoken: pct + ' percent of ' + base,
      answer,
      answerKind: 'decimal',
      meta: { pct, base, ctx: -1 },
    };
  }

  const ctx = rng.int(0, CONTEXTS[pct].length - 1);
  const { template } = CONTEXTS[pct][ctx] as Context;
  const { prompt, spoken } = phrase(template, { x: m(base), p: n(pct) });
  return {
    prompt,
    spoken,
    answer,
    answerKind: 'money',
    unit: '$',
    meta: { pct, base, ctx },
  };
}

function solve(problem: Problem): Step[] {
  const pct = metaNum(problem.meta, 'pct') as BasicPct;
  const base = metaNum(problem.meta, 'base');
  const ctx = metaNum(problem.meta, 'ctx');
  const ten = round2(base / 10);
  const five = round2(ten / 2);

  const steps: Step[] = [
    {
      text: 'Find 10% by moving the decimal point one place left: 10% of ' + num(base) + ' = ' + dec(ten) + '.',
      detail: '10% is the master block. Everything else here is built from it.',
    },
  ];
  if (pct === 5) {
    steps.push({ text: '5% is half of 10%: ' + dec(ten) + ' ÷ 2 = ' + dec(five) + '.' });
  }
  if (pct === 15) {
    steps.push({ text: '5% is half of that: ' + dec(ten) + ' ÷ 2 = ' + dec(five) + '.' });
    steps.push({
      text: '15% is 10% plus 5%: ' + dec(ten) + ' + ' + dec(five) + ' = ' + dec(problem.answer) + '.',
    });
  }
  if (ctx >= 0) {
    const context = CONTEXTS[pct][ctx];
    if (context) steps.push({ text: context.closing.replace('{A}', money(problem.answer)) });
  }
  return steps;
}

function hint(problem: Problem): string {
  // For 10% the first step IS the answer, so point at the move instead.
  if (metaNum(problem.meta, 'pct') === 10) {
    return 'Move the decimal point in ' + num(metaNum(problem.meta, 'base')) + ' one place to the left.';
  }
  return solve(problem)[0]?.text ?? '';
}

export const pctBasics = defineSkill({
  id: 'pct-basics',
  title: '10%, 5% and 15%',
  blurb: 'Shift the decimal for 10%, halve for 5%, add for 15%.',
  category: 'percent',
  order: 200,
  prereqs: [],
  truth: (meta: Meta) => (metaNum(meta, 'pct') * metaNum(meta, 'base')) / 100,
  lesson: {
    idea: [
      '10% of anything is that number with the decimal point moved one place left. Treat it as your building block — most everyday percentages are built from it.',
      'Half of 10% gives you 5%. Add the two together and you have 15%, the classic tip.',
    ],
    worked: {
      prompt: '15% tip on a $64 dinner',
      steps: [
        { text: '10%: move the decimal point → $6.40.' },
        { text: '5% is half of that → $3.20.' },
        { text: 'Add them: $6.40 + $3.20 = $9.60.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 2001 },
      { difficulty: 1, seed: 2002 },
      { difficulty: 2, seed: 2004 },
    ],
  },
  generate,
  solve,
  hint,
  constraints: [
    { name: 'percent is 10, 5 or 15', test: (p) => [10, 5, 15].includes(metaNum(p.meta, 'pct')) },
    { name: 'difficulty 1 answers are whole numbers', difficulty: 1, test: (p) => Number.isInteger(p.answer) },
    { name: 'answers are whole cents', test: (p) => round2(p.answer) === p.answer },
    {
      name: 'context problems are about money',
      test: (p) => metaNum(p.meta, 'ctx') < 0 || (p.answerKind === 'money' && p.unit === '$'),
    },
  ],
});
