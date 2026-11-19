import { defineSkill } from '../define';
import { metaNum, num } from '../helpers';
import { squareEndingIn5 } from '../tricks/square5';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * Squaring by going up and down the same amount:
 *   a² = (a + d)(a − d) + d²     47² = 50 × 44 + 3²
 * and its mirror image, "close together" pairs:
 *   (m − g)(m + g) = m² − g²      47 × 53 = 50² − 3²
 */

export interface SquarePlan {
  /** The round number a moves to (nearest multiple of `unit`). */
  round: number;
  /** a moved the same distance the other way. */
  other: number;
  /** How far a moved. */
  d: number;
  /** round × other. */
  product: number;
  answer: number;
}

/** Plans a² around the nearest multiple of 10 (two-digit) or 100 (three-digit). */
export function squarePlan(a: number, unit: 10 | 100): SquarePlan {
  const below = Math.floor(a / unit) * unit;
  const round = a - below <= unit / 2 ? below : below + unit;
  const d = Math.abs(a - round);
  const other = round > a ? a - d : a + d;
  const product = (round / unit) * other * unit;
  return { round, other, d, product, answer: product + smallSquare(d) };
}

/** d² for d under 100, the way you'd do it in your head (it recurses at most once). */
export function smallSquare(d: number): number {
  if (d < 10 || d % 10 === 0) return d * d; // times table, or a round ten
  if (d % 10 === 5) return squareEndingIn5(d);
  return squarePlan(d, 10).answer;
}

/** A one-line "how" for d², or null when it is a times-table fact. */
export function smallSquareHow(d: number): string | null {
  if (d < 10) return null;
  if (d % 10 === 0) return d / 10 + ' × ' + d / 10 + ' = ' + (d / 10) ** 2 + ', then add two zeros.';
  if (d % 10 === 5) {
    const k = (d - 5) / 10;
    return k + ' × ' + (k + 1) + ' = ' + k * (k + 1) + ', then tack on 25.';
  }
  const p = squarePlan(d, 10);
  return 'Same trick: ' + p.round + ' × ' + p.other + ' = ' + num(p.product) + ', plus ' + p.d + '² = ' + p.d * p.d + '.';
}

/** "Multiplying by 50 is 5 × 44 with a zero" — how to do round × other. */
function roundTimesHow(round: number, other: number, unit: 10 | 100): string {
  if (round === unit) return 'Multiplying by ' + num(unit) + ' just adds ' + (unit === 10 ? 'a zero' : 'two zeros') + '.';
  if (round === unit * 10) return 'Multiplying by ' + num(round) + ' just adds ' + (unit === 10 ? 'two zeros' : 'three zeros') + '.';
  const k = round / unit;
  return k + ' × ' + num(other) + ' = ' + num(k * other) + ', then add ' + (unit === 10 ? 'a zero' : 'two zeros') + '.';
}

function squareSteps(a: number, unit: 10 | 100, answer: number): Step[] {
  const p = squarePlan(a, unit);
  const up = p.round > a;
  const how = smallSquareHow(p.d);
  const sq: Step = { text: p.d + '² = ' + num(p.d * p.d) + '.' };
  if (how) sq.detail = how;
  return [
    {
      text:
        'Move ' + num(a) + ' ' + (up ? 'up' : 'down') + ' ' + p.d + ' to ' + num(p.round) +
        ', and ' + (up ? 'down' : 'up') + ' the same ' + p.d + ' to ' + num(p.other) + '.',
      detail: 'Up and down by the same amount: the square is their product plus that amount squared.',
    },
    { text: num(p.round) + ' × ' + num(p.other) + ' = ' + num(p.product) + '.', detail: roundTimesHow(p.round, p.other, unit) },
    sq,
    { text: 'Add them: ' + num(p.product) + ' + ' + num(p.d * p.d) + ' = ' + num(answer) + '.' },
  ];
}

// ================================================================ two-digit squares

/** A two-digit number within `ds` of a round ten, never ending in 0 or 5. */
function nearTen(rng: Rng, ds: number[], min: number, max: number): number {
  for (;;) {
    const a = rng.pick([-1, 1]) * rng.pick(ds) + rng.int(1, 10) * 10;
    if (a >= min && a <= max && a % 5 !== 0) return a;
  }
}

export const square2d = defineSkill({
  id: 'square-2d',
  title: 'Square any two-digit number',
  blurb: 'Go up and down to a round number, then add a small square.',
  category: 'multiply',
  order: 300,
  prereqs: ['square-5'],
  targetSeconds: [10, 15, 20],
  truth: (meta: Meta) => metaNum(meta, 'a') ** 2,
  lesson: {
    idea: [
      'To square 47, move it up 3 to 50 and down 3 to 44. 50 × 44 is easy because of the zero, and it is short of 47² by exactly 3², so add that back.',
      'Always go to the nearest round ten. The distance is never more than 4, so the small square at the end is a times-table fact.',
    ],
    worked: {
      prompt: '47²',
      steps: [
        { text: 'Up 3 to 50, down 3 to 44.' },
        { text: '50 × 44 = 2,200 (5 × 44 = 220, add a zero).' },
        { text: '3² = 9.' },
        { text: '2,200 + 9 = 2,209.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 3001 },
      { difficulty: 1, seed: 3002 },
      { difficulty: 2, seed: 3003 },
    ],
  },
  generate: (difficulty: Difficulty, rng: Rng): ProblemSpec => {
    const a =
      difficulty === 1 ? nearTen(rng, [1, 2], 11, 59) : difficulty === 2 ? nearTen(rng, [1, 2, 3, 4], 21, 99) : nearTen(rng, [3, 4], 41, 99);
    return { prompt: num(a) + '²', spoken: a + ' squared', answer: squarePlan(a, 10).answer, answerKind: 'integer', meta: { a } };
  },
  solve: (problem: Problem) => squareSteps(metaNum(problem.meta, 'a'), 10, problem.answer),
  constraints: [
    { name: 'two-digit, never ending in 0 or 5', test: (p) => metaNum(p.meta, 'a') >= 11 && metaNum(p.meta, 'a') <= 99 && metaNum(p.meta, 'a') % 5 !== 0 },
    { name: 'difficulty 1 is within 2 of a round ten', difficulty: 1, test: (p) => squarePlan(metaNum(p.meta, 'a'), 10).d <= 2 },
    { name: 'difficulty 3 is 3 or 4 from a round ten', difficulty: 3, test: (p) => squarePlan(metaNum(p.meta, 'a'), 10).d >= 3 },
  ],
});

// ================================================================ three-digit squares

/** Distance from the nearest hundred, by difficulty. Round tens past 10 are skipped (too easy). */
function distance(difficulty: Difficulty, rng: Rng): number {
  for (;;) {
    const d = difficulty === 1 ? rng.int(1, 9) : difficulty === 2 ? rng.int(11, 25) : rng.int(26, 49);
    if (d % 10 !== 0) return d;
  }
}

export const square3d = defineSkill({
  id: 'square-3d',
  title: 'Square three-digit numbers',
  blurb: 'The same up-and-down trick, around the nearest hundred.',
  category: 'multiply',
  order: 320,
  prereqs: ['square-2d', 'mult-2x1'],
  targetSeconds: [15, 30, 45],
  truth: (meta: Meta) => metaNum(meta, 'a') ** 2,
  lesson: {
    idea: [
      'Three-digit squares use the same move as two-digit ones, but to the nearest hundred. Squaring 343: go down 43 to 300 and up 43 to 386.',
      '300 × 386 is a one-digit multiplication with two zeros on the end. Then add 43², which you square with the two-digit trick. Say the big part out loud so you do not lose it while you work out the small one.',
    ],
    worked: {
      prompt: '343²',
      steps: [
        { text: 'Down 43 to 300, up 43 to 386.' },
        { text: '300 × 386 = 115,800 (3 × 386 = 1,158, add two zeros).' },
        { text: '43² = 1,849 (40 × 46 = 1,840, plus 3² = 9).' },
        { text: '115,800 + 1,849 = 117,649.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 3201 },
      { difficulty: 1, seed: 3202 },
      { difficulty: 2, seed: 3203 },
    ],
  },
  generate: (difficulty: Difficulty, rng: Rng): ProblemSpec => {
    for (;;) {
      const round = rng.int(1, 10) * 100;
      const a = round + rng.pick([-1, 1]) * distance(difficulty, rng);
      if (a < 101 || a > 999) continue;
      return { prompt: num(a) + '²', spoken: a + ' squared', answer: squarePlan(a, 100).answer, answerKind: 'integer', meta: { a } };
    }
  },
  solve: (problem: Problem) => squareSteps(metaNum(problem.meta, 'a'), 100, problem.answer),
  constraints: [
    { name: 'three-digit', test: (p) => metaNum(p.meta, 'a') >= 101 && metaNum(p.meta, 'a') <= 999 },
    { name: 'difficulty 1 is within 9 of a hundred', difficulty: 1, test: (p) => squarePlan(metaNum(p.meta, 'a'), 100).d <= 9 },
    { name: 'difficulty 2 is 11 to 25 from a hundred', difficulty: 2, test: (p) => { const d = squarePlan(metaNum(p.meta, 'a'), 100).d; return d >= 11 && d <= 25; } },
    { name: 'difficulty 3 is 26 to 49 from a hundred', difficulty: 3, test: (p) => squarePlan(metaNum(p.meta, 'a'), 100).d >= 26 },
  ],
});

// ================================================================ close-together pairs

/** (m − g)(m + g) = m² − g², with m² done the easy way. */
export function closePair(a: number, b: number): { mid: number; gap: number; midSq: number; answer: number } {
  const mid = (a + b) / 2;
  const gap = Math.abs(a - b) / 2;
  const midSq = mid % 10 === 5 ? squareEndingIn5(mid) : (mid / 10) ** 2 * 100;
  return { mid, gap, midSq, answer: midSq - gap * gap };
}

export const closePairs = defineSkill({
  id: 'close-pairs',
  title: 'Close-together pairs',
  blurb: 'Numbers either side of a middle: middle² minus gap².',
  category: 'multiply',
  order: 305,
  prereqs: ['square-2d'],
  targetSeconds: [8, 12, 18],
  truth: (meta: Meta) => metaNum(meta, 'a') * metaNum(meta, 'b'),
  lesson: {
    idea: [
      'When two numbers sit the same distance either side of an easy middle, like 47 and 53 around 50, their product is the middle squared minus the gap squared.',
      'It is the squaring trick run backwards. Look for pairs whose middle is a round ten or ends in 5.',
    ],
    worked: {
      prompt: '47 × 53',
      steps: [
        { text: 'Both are 3 away from 50.' },
        { text: '50² = 2,500.' },
        { text: '3² = 9.' },
        { text: '2,500 − 9 = 2,491.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 3051 },
      { difficulty: 1, seed: 3052 },
      { difficulty: 2, seed: 3053 },
    ],
  },
  generate: (difficulty: Difficulty, rng: Rng): ProblemSpec => {
    for (;;) {
      const mid = difficulty === 1 ? rng.int(2, 9) * 10 : difficulty === 2 ? rng.int(3, 19) * 5 : rng.int(4, 24) * 5;
      const gap = difficulty === 1 ? rng.int(1, 3) : difficulty === 2 ? rng.int(1, 5) : rng.int(4, 9);
      const lo = mid - gap;
      const hi = mid + gap;
      if (lo < 11 || lo % 10 === 0 || hi % 10 === 0) continue;
      const [a, b] = rng.chance(0.5) ? [lo, hi] : [hi, lo];
      return { prompt: num(a) + ' × ' + num(b), spoken: a + ' times ' + b, answer: closePair(a, b).answer, answerKind: 'integer', meta: { a, b } };
    }
  },
  solve: (problem: Problem): Step[] => {
    const a = metaNum(problem.meta, 'a');
    const b = metaNum(problem.meta, 'b');
    const { mid, gap, midSq } = closePair(a, b);
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
    return [
      {
        text: num(lo) + ' and ' + num(hi) + ' are both ' + gap + ' away from ' + num(mid) + '.',
        detail: 'Evenly spaced around a middle: the product is middle² minus gap².',
      },
      {
        text: num(mid) + '² = ' + num(midSq) + '.',
        detail:
          mid % 10 === 5
            ? (mid - 5) / 10 + ' × ' + ((mid - 5) / 10 + 1) + ' = ' + ((mid - 5) / 10) * ((mid - 5) / 10 + 1) + ', then tack on 25.'
            : mid / 10 + ' × ' + mid / 10 + ' = ' + (mid / 10) ** 2 + ', then add two zeros.',
      },
      { text: gap + '² = ' + gap * gap + '.' },
      { text: num(midSq) + ' − ' + gap * gap + ' = ' + num(problem.answer) + '.' },
    ];
  },
  constraints: [
    { name: 'both numbers are at least 11 and neither is a round ten', test: (p) => [p.meta.a, p.meta.b].every((v) => Number(v) >= 11 && Number(v) % 10 !== 0) },
    { name: 'the middle is a whole number ending in 0 or 5', test: (p) => (metaNum(p.meta, 'a') + metaNum(p.meta, 'b')) % 10 === 0 },
    { name: 'difficulty 1 is around a round ten, gap at most 3', difficulty: 1, test: (p) => { const c = closePair(metaNum(p.meta, 'a'), metaNum(p.meta, 'b')); return c.mid % 10 === 0 && c.gap <= 3; } },
  ],
});
