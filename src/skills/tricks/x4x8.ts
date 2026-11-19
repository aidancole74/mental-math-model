import { defineSkill } from '../define';
import { metaNum, num } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * ×4 and ×8 by doubling: 4 is 2 × 2, 8 is 2 × 2 × 2.
 * meta: { a, m } — the problem is a × m, with m in {4, 8}.
 */

export type Doubler = 4 | 8;

/** The chain of doublings: a × 4 -> [a, 2a, 4a]. Deliberately repeated addition, not a * m. */
export function doublings(a: number, m: Doubler): number[] {
  const chain = [a];
  const times = m === 4 ? 2 : 3;
  for (let i = 0; i < times; i++) {
    const last = chain[chain.length - 1] as number;
    chain.push(last + last);
  }
  return chain;
}

export function timesByDoubling(a: number, m: Doubler): number {
  const chain = doublings(a, m);
  return chain[chain.length - 1] as number;
}

/** Operands worth practising: never a round ten (40 × 4 is just 4 × 4 with a zero). */
function operand(rng: Rng, min: number, max: number): number {
  for (;;) {
    const a = rng.int(min, max);
    if (a % 10 !== 0) return a;
  }
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  let a: number;
  let m: Doubler;
  if (difficulty === 1) {
    m = 4;
    a = operand(rng, 12, 49);
  } else if (difficulty === 2) {
    m = rng.pick<Doubler>([4, 8]);
    a = m === 4 ? operand(rng, 51, 99) : operand(rng, 12, 49);
  } else {
    m = rng.pick<Doubler>([4, 8]);
    a = m === 4 ? operand(rng, 101, 499) : operand(rng, 101, 249);
  }
  const flipped = rng.chance(0.3);
  return {
    prompt: flipped ? m + ' × ' + num(a) : num(a) + ' × ' + m,
    spoken: flipped ? m + ' times ' + a : a + ' times ' + m,
    answer: timesByDoubling(a, m),
    answerKind: 'integer',
    meta: { a, m, flipped: flipped ? 1 : 0 },
  };
}

const ORDINAL = ['', 'Double', 'Double again', 'Double once more'];

function solve(problem: Problem): Step[] {
  const a = metaNum(problem.meta, 'a');
  const m = metaNum(problem.meta, 'm') as Doubler;
  const chain = doublings(a, m);
  const steps: Step[] = [];
  for (let i = 1; i < chain.length; i++) {
    const before = chain[i - 1] as number;
    const after = chain[i] as number;
    const step: Step = { text: ORDINAL[i] + ': ' + num(before) + ' + ' + num(before) + ' = ' + num(after) + '.' };
    if (i === 1) step.detail = m === 4 ? '× 4 is doubling twice.' : '× 8 is doubling three times.';
    steps.push(step);
  }
  const last = steps[steps.length - 1] as Step;
  const shown = problem.meta.flipped ? m + ' × ' + num(a) : num(a) + ' × ' + m;
  last.text += ' So ' + shown + ' = ' + num(problem.answer) + '.';
  return steps;
}

export const x4x8 = defineSkill({
  id: 'x4-x8',
  title: 'Multiply by 4 and 8',
  blurb: 'Double twice for 4, three times for 8.',
  category: 'tricks',
  order: 40,
  prereqs: [],
  truth: (meta: Meta) => metaNum(meta, 'a') * metaNum(meta, 'm'),
  hint: (problem) => {
    const a = metaNum(problem.meta, 'a');
    const m = metaNum(problem.meta, 'm');
    return (m === 4 ? 'Double ' + num(a) + ', then double that.' : 'Double ' + num(a) + ' three times in a row.');
  },
  lesson: {
    idea: [
      'Doubling is the easiest multiplication there is. Since 4 is two doubles and 8 is three, you never need the 4 or 8 times table.',
      'Double the whole number, then double the result. Each double is small enough to do left to right in one go.',
    ],
    worked: {
      prompt: '37 × 8',
      steps: [
        { text: 'Double 37: 74.' },
        { text: 'Double again: 148. That is 37 × 4.' },
        { text: 'Double once more: 296. That is 37 × 8.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 4001 },
      { difficulty: 1, seed: 4002 },
      { difficulty: 2, seed: 4003 },
    ],
  },
  generate,
  solve,
  constraints: [
    { name: 'multiplier is 4 or 8', test: (p) => [4, 8].includes(metaNum(p.meta, 'm')) },
    { name: 'operand is never a round ten', test: (p) => metaNum(p.meta, 'a') % 10 !== 0 },
    { name: 'difficulty 1 is two-digit × 4', difficulty: 1, test: (p) => metaNum(p.meta, 'm') === 4 && metaNum(p.meta, 'a') < 100 },
    { name: 'difficulty 3 uses a three-digit operand', difficulty: 3, test: (p) => metaNum(p.meta, 'a') >= 100 },
  ],
});
