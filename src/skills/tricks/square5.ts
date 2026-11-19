import { defineSkill } from '../define';
import { metaNum, num } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * Squaring a number that ends in 5.
 * meta: { n } — the number being squared. Always ends in 5.
 */

/**
 * Squares the trick way: chop the 5, multiply what is left by the next number
 * up, and tack 25 on the end. Tests cross-check this against n * n.
 */
export function squareEndingIn5(n: number): number {
  const k = (n - 5) / 10;
  return (k * (k + 1)) * 100 + 25;
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  // k is everything in front of the final 5.
  const k = difficulty === 1 ? rng.int(1, 5) : difficulty === 2 ? rng.int(6, 9) : rng.int(10, 99);
  const n = k * 10 + 5;
  return {
    prompt: num(n) + '²',
    spoken: n + ' squared',
    answer: squareEndingIn5(n),
    answerKind: 'integer',
    meta: { n, k },
  };
}

function solve(problem: Problem): Step[] {
  const n = metaNum(problem.meta, 'n');
  const k = (n - 5) / 10;
  const front = k * (k + 1);
  return [
    {
      text: 'Cover the final 5 of ' + num(n) + ', leaving ' + num(k) + '.',
      detail: 'Every number ending in 5 splits this way.',
    },
    {
      text: 'Multiply that by the next number up: ' + num(k) + ' × ' + num(k + 1) + ' = ' + num(front) + '.',
    },
    {
      text: 'Write 25 after it: ' + num(problem.answer) + '.',
      detail: 'A square ending in 5 always ends in 25.',
    },
  ];
}

export const square5 = defineSkill({
  id: 'square-5',
  title: 'Square numbers ending in 5',
  blurb: 'Front digits times the next number up, then 25.',
  category: 'tricks',
  order: 20,
  prereqs: [],
  truth: (meta: Meta) => metaNum(meta, 'n') * metaNum(meta, 'n'),
  lesson: {
    idea: [
      'Any number ending in 5 squares into something ending in 25. The only question is what goes in front.',
      'Take the part before the 5, multiply it by the next number up, and write 25 after the result. That is the whole method.',
    ],
    worked: {
      prompt: '35²',
      steps: [
        { text: 'Cover the final 5 of 35, leaving 3.' },
        { text: 'Multiply by the next number up: 3 × 4 = 12.' },
        { text: 'Write 25 after it: 1225.' },
        {
          text: 'It keeps working on bigger numbers: 115² → 11 × 12 = 132 → 13225.',
          detail: 'The front multiplication gets harder, not the trick.',
        },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 2201 },
      { difficulty: 1, seed: 2202 },
      { difficulty: 2, seed: 2203 },
    ],
  },
  generate,
  solve,
  constraints: [
    { name: 'the number always ends in 5', test: (p) => metaNum(p.meta, 'n') % 10 === 5 },
    {
      name: 'two-digit number at difficulty 1 and 2',
      test: (p) => p.difficulty === 3 || metaNum(p.meta, 'n') < 100,
    },
    {
      name: 'three-digit number at difficulty 3',
      difficulty: 3,
      test: (p) => metaNum(p.meta, 'n') >= 105 && metaNum(p.meta, 'n') <= 995,
    },
    { name: 'the answer always ends in 25', test: (p) => p.answer % 100 === 25 },
  ],
});
