import { defineSkill } from '../define';
import { metaNum, num } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';
import { additionPlan, finalValue } from './plan';

/**
 * Left-to-right addition.
 * meta: { a, b } — keep a whole, add b piece by piece. b never has a zero digit,
 * so every step in the walkthrough does something.
 */

/** A number with `digits` digits, none of them zero. */
function noZeroDigits(rng: Rng, digits: number): number {
  let n = 0;
  for (let i = 0; i < digits; i++) n = n * 10 + rng.int(1, 9);
  return n;
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  const a = difficulty === 1 ? rng.int(11, 99) : rng.int(101, 999);
  const b = noZeroDigits(rng, difficulty === 3 ? 3 : 2);
  return {
    prompt: num(a) + ' + ' + num(b),
    spoken: a + ' plus ' + b,
    answer: finalValue(a, additionPlan(a, b)),
    answerKind: 'integer',
    meta: { a, b },
  };
}

function solve(problem: Problem): Step[] {
  const a = metaNum(problem.meta, 'a');
  const b = metaNum(problem.meta, 'b');
  const moves = additionPlan(a, b);
  return moves.map((m, i) => {
    const eq = num(m.before) + ' + ' + num(m.amount) + ' = ' + num(m.after);
    if (i === 0) {
      return {
        text: 'Keep ' + num(a) + ' whole and add the ' + m.role + ' of ' + num(b) + ': ' + eq + '.',
        detail: 'Biggest piece first — you know roughly where you will land straight away.',
      };
    }
    return {
      text: 'Add the ' + m.role + ': ' + eq + '.',
    };
  });
}

export const ltrAdd = defineSkill({
  id: 'ltr-add',
  title: 'Add left to right',
  blurb: 'Keep one number whole, add the other biggest piece first.',
  category: 'addsub',
  order: 100,
  prereqs: [],
  truth: (meta: Meta) => metaNum(meta, 'a') + metaNum(meta, 'b'),
  lesson: {
    idea: [
      'On paper you add right to left, but in your head left to right works better: the biggest part of the answer shows up first, so you always know roughly where you are.',
      'Keep the first number whole. Break the second into hundreds, tens and ones, and add them on one at a time, keeping a running total.',
    ],
    worked: {
      prompt: '47 + 38',
      steps: [
        { text: 'Keep 47 whole. Add the tens of 38: 47 + 30 = 77.' },
        { text: 'Add the ones: 77 + 8 = 85.' },
        {
          text: 'Bigger numbers just take one more step: 538 + 347 → 838 → 878 → 885.',
          detail: 'Say the running total to yourself so you don’t lose it.',
        },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 1001 },
      { difficulty: 1, seed: 1002 },
      { difficulty: 2, seed: 1003 },
    ],
  },
  generate,
  solve,
  constraints: [
    { name: 'the second number has no zero digits', test: (p) => !String(p.meta.b).includes('0') },
    {
      name: 'difficulty 1 is two-digit plus two-digit',
      difficulty: 1,
      test: (p) => metaNum(p.meta, 'a') < 100 && metaNum(p.meta, 'b') < 100,
    },
    {
      name: 'difficulty 2 is three-digit plus two-digit',
      difficulty: 2,
      test: (p) => metaNum(p.meta, 'a') >= 100 && metaNum(p.meta, 'b') < 100,
    },
    {
      name: 'difficulty 3 is three-digit plus three-digit',
      difficulty: 3,
      test: (p) => metaNum(p.meta, 'a') >= 100 && metaNum(p.meta, 'b') >= 100,
    },
  ],
});
