import { defineSkill } from '../define';
import { metaNum, num } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * Multiplication left to right: 2×1 (and 3×1), then 2×2 and 2×3 by the
 * addition, subtraction or factoring method.
 */

// ===================================================================== by one digit

/** 468 -> [400, 60, 8], skipping zero places. */
export function placeParts(a: number): number[] {
  const digits = String(a).split('').map(Number);
  return digits
    .map((d, i) => d * 10 ** (digits.length - 1 - i))
    .filter((v) => v > 0);
}

/** a × b left to right: each place times b, added to a running total. */
export function leftToRight(a: number, b: number): { part: number; product: number; total: number }[] {
  let total = 0;
  return placeParts(a).map((part) => {
    const product = part * b;
    total += product;
    return { part, product, total };
  });
}

export function timesOneDigit(a: number, b: number): number {
  const rows = leftToRight(a, b);
  return rows[rows.length - 1]?.total ?? 0;
}

function noRoundEnd(rng: Rng, min: number, max: number): number {
  for (;;) {
    const v = rng.int(min, max);
    if (v % 10 !== 0) return v;
  }
}

export const mult2x1 = defineSkill({
  id: 'mult-2x1',
  title: 'Multiply by one digit',
  blurb: 'Biggest part first, then add as you go.',
  category: 'multiply',
  order: 310,
  prereqs: ['ltr-add'],
  targetSeconds: [6, 8, 15],
  truth: (meta: Meta) => metaNum(meta, 'a') * metaNum(meta, 'b'),
  lesson: {
    idea: [
      'School teaches multiplication right to left, which hands you the answer backwards. In your head, start with the biggest part: you hear the size of the answer straight away.',
      'Split the number by place, multiply each part, and keep a running total. Each step is a times-table fact with zeros on the end.',
    ],
    worked: {
      prompt: '47 × 6',
      steps: [
        { text: 'Split 47 into 40 + 7.' },
        { text: '40 × 6 = 240.' },
        { text: '7 × 6 = 42.' },
        { text: '240 + 42 = 282.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 3101 },
      { difficulty: 1, seed: 3102 },
      { difficulty: 2, seed: 3103 },
    ],
  },
  generate: (difficulty: Difficulty, rng: Rng): ProblemSpec => {
    const a = difficulty === 1 ? noRoundEnd(rng, 12, 49) : difficulty === 2 ? noRoundEnd(rng, 51, 99) : noRoundEnd(rng, 101, 999);
    const b = difficulty === 1 ? rng.int(3, 6) : rng.int(6, 9);
    const flipped = rng.chance(0.3);
    return {
      prompt: flipped ? b + ' × ' + num(a) : num(a) + ' × ' + b,
      spoken: flipped ? b + ' times ' + a : a + ' times ' + b,
      answer: timesOneDigit(a, b),
      answerKind: 'integer',
      meta: { a, b, flipped: flipped ? 1 : 0 },
    };
  },
  solve: (problem: Problem): Step[] => {
    const a = metaNum(problem.meta, 'a');
    const b = metaNum(problem.meta, 'b');
    const rows = leftToRight(a, b);
    const steps: Step[] = [
      {
        text: 'Split ' + num(a) + ' into ' + rows.map((r) => num(r.part)).join(' + ') + '.',
        detail: 'Multiply the biggest part first and keep a running total.',
      },
    ];
    rows.forEach((r, i) => {
      const eq = num(r.part) + ' × ' + b + ' = ' + num(r.product);
      steps.push({ text: i === 0 ? eq + '.' : eq + ', and ' + num(rows[i - 1]?.total ?? 0) + ' + ' + num(r.product) + ' = ' + num(r.total) + '.' });
    });
    return steps;
  },
  constraints: [
    { name: 'multiplier is 3 to 9', test: (p) => metaNum(p.meta, 'b') >= 3 && metaNum(p.meta, 'b') <= 9 },
    { name: 'never a round ten', test: (p) => metaNum(p.meta, 'a') % 10 !== 0 },
    { name: 'difficulty 3 is three-digit × one-digit', difficulty: 3, test: (p) => metaNum(p.meta, 'a') >= 100 },
  ],
});

// ===================================================================== 2×2 and 2×3

export type Method = 'add' | 'subtract' | 'factor';
export const METHODS: Method[] = ['add', 'subtract', 'factor'];

/** b as x × y with one-digit factors as close together as possible, or null. 42 -> [6, 7]. */
export function factorPair(b: number): [number, number] | null {
  let best: [number, number] | null = null;
  for (let x = 2; x <= 9; x++) {
    if (b % x !== 0) continue;
    const y = b / x;
    if (y < x || y > 9) continue;
    if (!best || y - x < best[1] - best[0]) best = [x, y];
  }
  return best;
}

export interface MultPlan {
  method: Method;
  /** Lines of arithmetic, in order. The last value is the answer. */
  parts: { label: string; value: number }[];
  answer: number;
}

/** a × b by the given method, where b is the two-digit number that gets taken apart. */
export function multPlan(a: number, b: number, method: Method): MultPlan {
  if (method === 'add') {
    const tens = b - (b % 10);
    const ones = b % 10;
    const big = a * (tens / 10) * 10;
    const small = a * ones;
    return { method, parts: [{ label: 'big', value: big }, { label: 'small', value: small }], answer: big + small };
  }
  if (method === 'subtract') {
    const up = b + (10 - (b % 10));
    const k = up - b;
    const big = a * (up / 10) * 10;
    const small = a * k;
    return { method, parts: [{ label: 'big', value: big }, { label: 'small', value: small }], answer: big - small };
  }
  const pair = factorPair(b);
  if (!pair) throw new Error(b + ' has no one-digit factor pair');
  const first = a * pair[0];
  return { method, parts: [{ label: 'first', value: first }], answer: first * pair[1] };
}

function multSteps(problem: Problem): Step[] {
  const a = metaNum(problem.meta, 'a');
  const b = metaNum(problem.meta, 'b');
  const method = METHODS[metaNum(problem.meta, 'method')] as Method;
  const plan = multPlan(a, b, method);
  const ans = num(problem.answer);

  if (method === 'add') {
    const tens = b - (b % 10);
    const ones = b % 10;
    const [big, small] = plan.parts.map((p) => p.value) as [number, number];
    return [
      { text: 'Split ' + b + ' into ' + tens + ' + ' + ones + '.', detail: 'Addition method: multiply by each part and add.' },
      {
        text: num(a) + ' × ' + tens + ' = ' + num(big) + '.',
        detail: tens === 10 ? 'Multiplying by 10 just adds a zero.' : num(a) + ' × ' + tens / 10 + ' = ' + num(big / 10) + ', then add a zero.',
      },
      { text: num(a) + ' × ' + ones + ' = ' + num(small) + '.' },
      { text: num(big) + ' + ' + num(small) + ' = ' + ans + '.' },
    ];
  }
  if (method === 'subtract') {
    const up = b + (10 - (b % 10));
    const k = up - b;
    const [big, small] = plan.parts.map((p) => p.value) as [number, number];
    return [
      {
        text: b + ' is ' + up + ' − ' + k + ', so work out ' + num(a) + ' × ' + up + ' and take away ' + num(a) + ' × ' + k + '.',
        detail: 'Subtraction method: rounding up to a ten is easier when the last digit is 8 or 9.',
      },
      { text: num(a) + ' × ' + up + ' = ' + num(big) + '.', detail: num(a) + ' × ' + up / 10 + ' = ' + num(big / 10) + ', then add a zero.' },
      { text: num(a) + ' × ' + k + ' = ' + num(small) + '.' },
      { text: num(big) + ' − ' + num(small) + ' = ' + ans + '.' },
    ];
  }
  const [x, y] = factorPair(b) as [number, number];
  const first = plan.parts[0]?.value ?? 0;
  return [
    { text: b + ' = ' + x + ' × ' + y + ', so multiply ' + num(a) + ' by ' + x + ', then by ' + y + '.', detail: 'Factoring method: two one-digit multiplications, no adding.' },
    { text: num(a) + ' × ' + x + ' = ' + num(first) + '.' },
    { text: num(first) + ' × ' + y + ' = ' + ans + '.' },
  ];
}

/** Two-digit numbers that suit each method. */
function pickB(method: Method, rng: Rng, min: number, max: number, onesMax = 9): number {
  for (;;) {
    const b = rng.int(min, max);
    if (b % 10 === 0 || b % 11 === 0) continue; // round tens and ×11 have their own tricks
    if (method === 'add' && b % 10 <= onesMax && b % 10 < 8) return b;
    if (method === 'subtract' && b % 10 >= 8) return b;
    if (method === 'factor' && factorPair(b) && b % 10 < 8) return b;
  }
}

function multGenerate(a: number, b: number, method: Method, rng: Rng): ProblemSpec {
  // a === b is a square, which has its own (better) trick.
  if (a === b) a = a === 99 ? a - 2 : a + (a % 10 === 9 ? 2 : 1);
  const flipped = rng.chance(0.5);
  return {
    prompt: flipped ? num(b) + ' × ' + num(a) : num(a) + ' × ' + num(b),
    spoken: flipped ? b + ' times ' + a : a + ' times ' + b,
    answer: multPlan(a, b, method).answer,
    answerKind: 'integer',
    meta: { a, b, method: METHODS.indexOf(method), flipped: flipped ? 1 : 0 },
  };
}

const multConstraints = [
  { name: 'the split number is two-digit, not a round ten', test: (p: Problem) => metaNum(p.meta, 'b') >= 12 && metaNum(p.meta, 'b') <= 99 && metaNum(p.meta, 'b') % 10 !== 0 },
  {
    name: 'the method fits the numbers',
    test: (p: Problem) => {
      const b = metaNum(p.meta, 'b');
      const method = METHODS[metaNum(p.meta, 'method')];
      if (method === 'subtract') return b % 10 >= 8;
      if (method === 'factor') return factorPair(b) !== null;
      return b % 10 < 8;
    },
  },
];

export const mult2x2 = defineSkill({
  id: 'mult-2x2',
  title: 'Two-digit by two-digit',
  blurb: 'Add, subtract or factor — pick the method that fits.',
  category: 'multiply',
  order: 315,
  prereqs: ['mult-2x1'],
  targetSeconds: [12, 18, 25],
  truth: (meta: Meta) => metaNum(meta, 'a') * metaNum(meta, 'b'),
  lesson: {
    idea: [
      'Break one number apart and turn a hard problem into two easy ones. There are three ways to break it, and the digits tell you which to use.',
      'Usually split it into tens and ones and add (47 × 23 = 47 × 20 + 47 × 3). If it ends in 8 or 9, round it up and subtract (47 × 29 = 47 × 30 − 47). If it is a times-table answer like 42, multiply by its factors one after the other (47 × 42 = 47 × 6 × 7).',
    ],
    worked: {
      prompt: '47 × 29',
      steps: [
        { text: '29 ends in 9, so use 30 − 1.' },
        { text: '47 × 30 = 1,410.' },
        { text: '47 × 1 = 47.' },
        { text: '1,410 − 47 = 1,363.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 3151 },
      { difficulty: 2, seed: 3152 },
      { difficulty: 2, seed: 3154 },
    ],
  },
  generate: (difficulty: Difficulty, rng: Rng): ProblemSpec => {
    if (difficulty === 1) return multGenerate(noRoundEnd(rng, 12, 49), pickB('add', rng, 12, 43, 3), 'add', rng);
    if (difficulty === 2) {
      const method = rng.pick<Method>(['subtract', 'factor']);
      return multGenerate(noRoundEnd(rng, 12, 99), pickB(method, rng, 12, 89), method, rng);
    }
    const method = rng.pick(METHODS);
    return multGenerate(noRoundEnd(rng, 51, 99), pickB(method, rng, method === 'factor' ? 24 : 51, 99), method, rng);
  },
  solve: multSteps,
  constraints: [
    ...multConstraints,
    { name: 'the other number is two-digit', test: (p) => metaNum(p.meta, 'a') >= 12 && metaNum(p.meta, 'a') <= 99 },
    { name: 'difficulty 1 uses addition', difficulty: 1, test: (p) => METHODS[metaNum(p.meta, 'method')] === 'add' },
    { name: 'difficulty 2 uses subtraction or factoring', difficulty: 2, test: (p) => METHODS[metaNum(p.meta, 'method')] !== 'add' },
  ],
});

export const mult2x3 = defineSkill({
  id: 'mult-2x3',
  title: 'Two-digit by three-digit',
  blurb: 'Same three methods, with a bigger number riding along.',
  category: 'multiply',
  order: 325,
  prereqs: ['mult-2x2'],
  targetSeconds: [15, 30, 45],
  truth: (meta: Meta) => metaNum(meta, 'a') * metaNum(meta, 'b'),
  lesson: {
    idea: [
      'Always take the two-digit number apart and keep the three-digit one whole. Then each step is a three-digit number times one digit, which you already do left to right.',
      'The same three methods work: split and add, round up and subtract, or factor. Factoring is often quickest because there is nothing to hold in memory while you add.',
    ],
    worked: {
      prompt: '324 × 16',
      steps: [
        { text: '16 = 4 × 4, so multiply by 4 twice.' },
        { text: '324 × 4 = 1,296.' },
        { text: '1,296 × 4 = 5,184.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 3251 },
      { difficulty: 1, seed: 3252 },
      { difficulty: 2, seed: 3253 },
    ],
  },
  generate: (difficulty: Difficulty, rng: Rng): ProblemSpec => {
    const a = noRoundEnd(rng, 101, 999);
    if (difficulty === 1) return multGenerate(a, pickB('add', rng, 12, 19), 'add', rng);
    if (difficulty === 2) {
      const method = rng.pick<Method>(['subtract', 'factor']);
      return multGenerate(a, pickB(method, rng, 12, 49), method, rng);
    }
    const method = rng.pick(METHODS);
    return multGenerate(a, pickB(method, rng, method === 'factor' ? 24 : 51, 99), method, rng);
  },
  solve: multSteps,
  constraints: [
    ...multConstraints,
    { name: 'the other number is three-digit', test: (p) => metaNum(p.meta, 'a') >= 101 && metaNum(p.meta, 'a') <= 999 },
    { name: 'difficulty 1 splits a number in the teens', difficulty: 1, test: (p) => metaNum(p.meta, 'b') < 20 },
  ],
});
