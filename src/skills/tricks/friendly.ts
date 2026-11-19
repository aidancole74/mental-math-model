import { defineSkill } from '../define';
import { metaNum, num } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * ×9, ×5 and ×25 — friendly numbers in disguise.
 *   9 = 10 − 1      5 = 10 ÷ 2      25 = 100 ÷ 4
 * meta: { a, m } — the problem is a × m, with m in {9, 5, 25}.
 */

export type Friendly = 9 | 5 | 25;

/** Computes a × m the trick way (deliberately not a * m). */
export function timesFriendly(a: number, m: Friendly): number {
  if (m === 9) return a * 10 - a;
  if (m === 5) return a % 2 === 0 ? (a / 2) * 10 : (a * 10) / 2;
  return a % 4 === 0 ? (a / 4) * 100 : (a * 100) / 2 / 2;
}

function operand(difficulty: Difficulty, m: Friendly, rng: Rng): number {
  if (m === 9) {
    return difficulty === 1 ? rng.int(12, 99) : difficulty === 2 ? rng.int(101, 999) : rng.int(1001, 9999);
  }
  if (m === 5) {
    if (difficulty === 1) return rng.int(6, 49) * 2; // even: halve, add a zero
    if (difficulty === 2) return rng.int(6, 49) * 2 + 1; // odd two-digit
    return rng.int(101, 999);
  }
  // m === 25
  if (difficulty === 1) return rng.int(3, 24) * 4; // divides by 4 cleanly
  if (difficulty === 2) {
    for (;;) {
      const a = rng.int(11, 99);
      if (a % 4 !== 0) return a;
    }
  }
  return rng.int(101, 999);
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  const m = rng.pick<Friendly>([9, 5, 25]);
  const a = operand(difficulty, m, rng);
  return {
    prompt: num(a) + ' × ' + m,
    spoken: a + ' times ' + m,
    answer: timesFriendly(a, m),
    answerKind: 'integer',
    meta: { a, m },
  };
}

function solve(problem: Problem): Step[] {
  const a = metaNum(problem.meta, 'a');
  const m = metaNum(problem.meta, 'm') as Friendly;
  const ans = num(problem.answer);

  if (m === 9) {
    return [
      {
        text: 'Multiply by 10 instead: ' + num(a) + ' × 10 = ' + num(a * 10) + '.',
        detail: '9 is one less than 10.',
      },
      { text: 'That is one ' + num(a) + ' too many, so take it away: ' + num(a * 10) + ' − ' + num(a) + ' = ' + ans + '.' },
    ];
  }
  if (m === 5) {
    if (a % 2 === 0) {
      return [
        { text: 'Halve ' + num(a) + ': ' + num(a) + ' ÷ 2 = ' + num(a / 2) + '.', detail: '5 is half of 10.' },
        { text: 'Now multiply by 10 — add a zero: ' + ans + '.' },
      ];
    }
    return [
      { text: 'Multiply by 10: ' + num(a) + ' × 10 = ' + num(a * 10) + '.', detail: '5 is half of 10.' },
      { text: 'Then halve it: ' + num(a * 10) + ' ÷ 2 = ' + ans + '.' },
    ];
  }
  if (a % 4 === 0) {
    return [
      { text: 'Divide ' + num(a) + ' by 4: ' + num(a) + ' ÷ 4 = ' + num(a / 4) + '.', detail: '25 is a quarter of 100.' },
      { text: 'Now multiply by 100 — add two zeros: ' + ans + '.' },
    ];
  }
  return [
    { text: 'Multiply by 100: ' + num(a) + ' × 100 = ' + num(a * 100) + '.', detail: '25 is a quarter of 100.' },
    { text: 'Divide by 4 by halving twice: ' + num(a * 100) + ' → ' + num(a * 50) + ' → ' + ans + '.' },
  ];
}

export const friendly = defineSkill({
  id: 'x9-x5-x25',
  title: 'Multiply by 9, 5 and 25',
  blurb: 'Use 10 and 100 instead, then fix it up.',
  category: 'tricks',
  order: 30,
  prereqs: [],
  truth: (meta: Meta) => metaNum(meta, 'a') * metaNum(meta, 'm'),
  lesson: {
    idea: [
      'These three are friendly numbers in disguise: 9 is one less than 10, 5 is half of 10, and 25 is a quarter of 100.',
      'Multiply by the friendly number instead, then fix it: take one copy away for 9, halve for 5, quarter for 25.',
    ],
    worked: {
      prompt: '47 × 9',
      steps: [
        { text: '47 × 10 = 470.' },
        { text: 'One 47 too many: 470 − 47 = 423.' },
        { text: 'Same idea for 5: 48 × 5 → half of 48 is 24 → 240.' },
        { text: 'And for 25: 36 × 25 → 36 ÷ 4 = 9 → 900.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 3001 },
      { difficulty: 1, seed: 3002 },
      { difficulty: 1, seed: 3005 },
    ],
  },
  generate,
  solve,
  constraints: [
    { name: 'multiplier is 9, 5 or 25', test: (p) => [9, 5, 25].includes(metaNum(p.meta, 'm')) },
    {
      name: 'difficulty 1: ×5 operands are even, ×25 operands divide by 4',
      difficulty: 1,
      test: (p) => {
        const a = metaNum(p.meta, 'a');
        const m = metaNum(p.meta, 'm');
        return (m !== 5 || a % 2 === 0) && (m !== 25 || a % 4 === 0);
      },
    },
    {
      name: 'difficulty 2: ×5 operands are odd, ×25 operands do not divide by 4',
      difficulty: 2,
      test: (p) => {
        const a = metaNum(p.meta, 'a');
        const m = metaNum(p.meta, 'm');
        return (m !== 5 || a % 2 === 1) && (m !== 25 || a % 4 !== 0);
      },
    },
  ],
});
