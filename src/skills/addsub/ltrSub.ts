import { defineSkill } from '../define';
import { metaNum, num } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';
import { finalValue, subtractionPlan, type Move } from './plan';

/**
 * Left-to-right subtraction, with "round up and give back" when the last digit
 * being taken away is 7, 8 or 9.
 * meta: { a, b } — the problem is a − b. b never has a zero digit.
 */

function noZeroDigits(rng: Rng, digits: number, max: number): number {
  for (;;) {
    let n = 0;
    for (let i = 0; i < digits; i++) n = n * 10 + rng.int(1, 9);
    if (n <= max) return n;
  }
}

/**
 * True for problems not worth practising: matching last digits (844 − 444 is
 * trivial, and its answer ends in 0) or an answer equal to the number taken away.
 */
function isDull(a: number, b: number): boolean {
  return (a - b) % 10 === 0 || a - b === b;
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  for (;;) {
    const [a, b] = pick(difficulty, rng);
    if (isDull(a, b)) continue;
    return {
      prompt: num(a) + ' − ' + num(b),
      spoken: a + ' minus ' + b,
      answer: finalValue(a, subtractionPlan(a, b)),
      answerKind: 'integer',
      meta: { a, b },
    };
  }
}

function pick(difficulty: Difficulty, rng: Rng): [number, number] {
  let a: number;
  let b: number;
  if (difficulty === 1) {
    // Two-digit minus two-digit, answer at least 10.
    b = noZeroDigits(rng, 2, 89);
    a = rng.int(b + 10, 99);
  } else if (difficulty === 2) {
    // Three-digit minus two-digit, answer at least 100.
    b = noZeroDigits(rng, 2, 99);
    a = rng.int(Math.max(101, b + 100), 999);
  } else {
    b = noZeroDigits(rng, 3, 899);
    a = rng.int(b + 100, 999);
  }
  return [a, b];
}

function describe(m: Move, b: number): string {
  const eq = num(m.before) + ' ' + m.op + ' ' + num(m.amount) + ' = ' + num(m.after);
  switch (m.role) {
    case 'hundreds':
      return 'Take away the hundreds of ' + num(b) + ': ' + eq + '.';
    case 'tens':
      return 'Take away the tens: ' + eq + '.';
    case 'ones':
      return 'Take away the ones: ' + eq + '.';
    case 'round-up':
      return 'Round ' + num(b % 100) + ' up to ' + num(m.amount) + ' and take that away: ' + eq + '.';
    case 'give-back':
      return 'You took ' + m.amount + ' too many, so give ' + m.amount + ' back: ' + eq + '.';
  }
}

function solve(problem: Problem): Step[] {
  const b = metaNum(problem.meta, 'b');
  return subtractionPlan(metaNum(problem.meta, 'a'), b).map((m) => {
    const step: Step = { text: describe(m, b) };
    if (m.role === 'round-up') {
      step.detail = 'Taking away a round number is easier than borrowing.';
    }
    return step;
  });
}

export const ltrSub = defineSkill({
  id: 'ltr-sub',
  title: 'Subtract left to right',
  blurb: 'Biggest piece first; round up and give back when it helps.',
  category: 'addsub',
  order: 110,
  prereqs: ['ltr-add'],
  truth: (meta: Meta) => metaNum(meta, 'a') - metaNum(meta, 'b'),
  lesson: {
    idea: [
      'Subtract the same way you add: keep the first number whole and take the second away one piece at a time, biggest first.',
      'When the last digit you are taking away is 7, 8 or 9, round up instead. Taking away 50 and giving 3 back is much easier than taking away 47 and borrowing.',
    ],
    worked: {
      prompt: '83 − 47',
      steps: [
        { text: '47 ends in 7, so round it up to 50. Take that away: 83 − 50 = 33.' },
        { text: 'You took 3 too many, so give 3 back: 33 + 3 = 36.' },
        {
          text: 'With a small last digit, just go piece by piece: 85 − 23 → 85 − 20 = 65 → 65 − 3 = 62.',
        },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 1101 },
      { difficulty: 1, seed: 1104 },
      { difficulty: 2, seed: 1103 },
    ],
  },
  generate,
  solve,
  constraints: [
    { name: 'the number taken away has no zero digits', test: (p) => !String(p.meta.b).includes('0') },
    { name: 'difficulty 1 answers are at least 10', difficulty: 1, test: (p) => p.answer >= 10 },
    { name: 'last digits never match (answer never ends in 0)', test: (p) => p.answer % 10 !== 0 },
    { name: 'answer is never the number taken away', test: (p) => p.answer !== metaNum(p.meta, 'b') },
    { name: 'difficulty 2 and 3 answers are at least 100', test: (p) => p.difficulty === 1 || p.answer >= 100 },
    {
      name: 'difficulty 2 takes a two-digit number from a three-digit one',
      difficulty: 2,
      test: (p) => metaNum(p.meta, 'a') >= 100 && metaNum(p.meta, 'b') < 100,
    },
    {
      name: 'difficulty 3 is three-digit minus three-digit',
      difficulty: 3,
      test: (p) => metaNum(p.meta, 'b') >= 100,
    },
  ],
});
