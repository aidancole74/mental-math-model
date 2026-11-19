import { defineSkill } from '../define';
import { dec, metaNum, metaStr, money, num, round2 } from '../helpers';
import { exactLine, m, phrase, tenPercent } from '../percent/phrase';
import type { Constraint, Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * Estimation ("guesstimation"): round to friendly numbers, work with those,
 * and land within 10%. Every problem stores the walkthrough's own estimate in
 * meta.est, and a constraint checks that estimate really is within tolerance.
 */

const withinTolerance: Constraint = {
  name: 'the walkthrough’s own estimate is within the tolerance',
  test: (p) => Math.abs(metaNum(p.meta, 'est') - p.answer) <= (p.tolerance ?? 0) + 1e-9,
};

/** 10% of a whole-number answer, rounded down so the range stays whole. */
export function tenPercentWhole(answer: number): number {
  return Math.max(1, Math.floor(Math.abs(answer) / 10));
}

/** Rounds to one significant figure in a given direction: 47 -> 40 (down) / 50 (up). */
export function oneFigure(x: number, dir: 'down' | 'up'): number {
  const unit = 10 ** (String(Math.floor(x)).length - 1);
  const down = Math.floor(x / unit) * unit;
  return dir === 'down' || down === x ? down : down + unit;
}

function nearestOneFigure(x: number): number {
  const down = oneFigure(x, 'down');
  const up = oneFigure(x, 'up');
  return x - down < up - x ? down : up;
}

/** Rough rounding the walkthrough is happy with; past this it tries a finer rounding. */
const GOOD = 0.05;

function relErr(est: number, exact: number): number {
  return Math.abs(est - exact) / exact;
}

const ZERO_WORDS = ['no zeros', 'one zero', 'two zeros', 'three zeros', 'four zeros', 'five zeros', 'six zeros'];

/** Trailing zeros, for "drop the zeros, multiply, put them back". */
function zeros(x: number): number {
  let z = 0;
  while (x >= 10 && x % 10 === 0) {
    x /= 10;
    z++;
  }
  return z;
}

// ===================================================================== round and add

function price(rng: Rng, maxDollars: number): number {
  const cents = rng.pick([99, 95, 49, 89, 79, 25, 15, 29, 59, 69, 39, 9, 50, 75]);
  return round2(rng.int(1, maxDollars) + cents / 100);
}

export const estRound = defineSkill({
  id: 'est-round',
  title: 'Round and add',
  blurb: 'Total a basket by rounding each price to the dollar.',
  category: 'estimate',
  order: 500,
  prereqs: ['ltr-add'],
  answerMode: 'estimate',
  targetSeconds: [8, 12, 18],
  truth: (meta: Meta) => round2(metaStr(meta, 'prices').split(',').map(Number).reduce((a, b) => a + b, 0)),
  hint: () => 'Round each price to the nearest whole dollar, then add those.',
  lesson: {
    idea: [
      'You rarely need the exact total at the till, just a good guess. Round each price to the nearest dollar and add the round numbers.',
      'Prices like $7.99 round up and prices like $3.15 round down, so the errors partly cancel. Anything within 10% of the exact total counts.',
    ],
    worked: {
      prompt: 'About how much is $3.89 + $12.49 + $7.99?',
      steps: [
        { text: 'Round each: $4, $12, $8.' },
        { text: '4 + 12 + 8 = $24.' },
        { text: 'About $24. (Exact: $24.37.)' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 5001 },
      { difficulty: 1, seed: 5002 },
      { difficulty: 2, seed: 5003 },
    ],
  },
  generate: (difficulty: Difficulty, rng: Rng): ProblemSpec => {
    const count = difficulty === 1 ? 3 : difficulty === 2 ? 4 : rng.int(5, 6);
    const maxDollars = difficulty === 1 ? 15 : difficulty === 2 ? 30 : 60;
    for (;;) {
      const prices = Array.from({ length: count }, () => price(rng, maxDollars));
      const rounded = prices.map((p) => Math.round(p));
      const est = rounded.reduce((a, b) => a + b, 0);
      // Exact total the long way, cent by cent.
      const answer = prices.reduce((a, p) => a + Math.round(p * 100), 0) / 100;
      const tolerance = tenPercent(answer);
      if (Math.abs(est - answer) > tolerance) continue;
      const slots = Object.fromEntries(prices.map((p, i) => ['p' + i, m(p)]));
      const template = 'About how much is ' + prices.map((_, i) => '{p' + i + '}').join(' + ') + '?';
      const { prompt, spoken } = phrase(template, slots);
      return {
        prompt,
        spoken: spoken.replace(/ \+ /g, ' plus '),
        answer,
        answerKind: 'money',
        unit: '$',
        tolerance,
        meta: { prices: prices.join(','), est },
      };
    }
  },
  solve: (problem: Problem): Step[] => {
    const prices = metaStr(problem.meta, 'prices').split(',').map(Number);
    const rounded = prices.map((p) => Math.round(p));
    const est = metaNum(problem.meta, 'est');
    return [
      { text: 'Round each price to the nearest dollar: ' + rounded.map((r) => money(r)).join(', ') + '.', detail: '50¢ or more rounds up; less rounds down.' },
      { text: 'Add the round numbers: ' + rounded.join(' + ') + ' = ' + money(est) + '.' },
      { text: 'So about ' + money(est) + '. ' + exactLine(problem.answer, problem.tolerance ?? 0, money) },
    ];
  },
  constraints: [withinTolerance],
});

// ===================================================================== products

/** One-figure roundings of x either way, plus the halfway point between them (47 -> 40, 45, 50). */
export function roundings(x: number): { value: number; half: boolean }[] {
  const down = oneFigure(x, 'down');
  const up = oneFigure(x, 'up');
  const out = [{ value: down, half: false }, { value: up, half: false }];
  if (x >= 10 && up !== down) out.push({ value: (down + up) / 2, half: true });
  return out;
}

/**
 * Rounds a and b for a quick product. Prefers plain one-figure roundings (one up,
 * one down cancels best); allows a halfway number like 35 only when that brings
 * the estimate within 5% and the plain ones don't. Picks the closest within each tier.
 */
export function productRounding(a: number, b: number): { ra: number; rb: number } {
  const exact = a * b;
  let best: { ra: number; rb: number; halves: number; err: number } | null = null;
  for (const x of roundings(a)) {
    for (const y of roundings(b)) {
      const halves = Number(x.half) + Number(y.half);
      if (halves > 1) continue; // one awkward number at most
      const err = relErr(x.value * y.value, exact);
      const tier = (e: number, h: number): number => (e <= GOOD ? h : 10 + e);
      if (!best || tier(err, halves) < tier(best.err, best.halves) || (tier(err, halves) === tier(best.err, best.halves) && err < best.err)) {
        best = { ra: x.value, rb: y.value, halves, err };
      }
    }
  }
  return { ra: (best as { ra: number }).ra, rb: (best as { rb: number }).rb };
}

function messy(rng: Rng, min: number, max: number): number {
  for (;;) {
    const v = rng.int(min, max);
    if (v % 10 !== 0) return v;
  }
}

function roundedWord(x: number, r: number): string {
  return r > x ? 'up to ' + num(r) : 'down to ' + num(r);
}

export const estProduct = defineSkill({
  id: 'est-product',
  title: 'Estimate products',
  blurb: 'One figure each, one up and one down.',
  category: 'estimate',
  order: 505,
  prereqs: ['mult-2x1'],
  answerMode: 'estimate',
  targetSeconds: [6, 10, 15],
  truth: (meta: Meta) => metaNum(meta, 'a') * metaNum(meta, 'b'),
  hint: (problem) =>
    'Round ' + num(metaNum(problem.meta, 'a')) + ' and ' + num(metaNum(problem.meta, 'b')) + ' to friendly numbers — one up and one down if you can.',
  lesson: {
    idea: [
      'Round each number to a single non-zero digit followed by zeros, multiply the digits, and put the zeros back. 47 × 83 becomes 50 × 80 = 4,000.',
      'If one number rounds up, round the other down: the errors cancel. When that is still far off, use a halfway number like 35 or 450 for one of them. Anything within 10% counts.',
    ],
    worked: {
      prompt: 'About what is 47 × 83?',
      steps: [
        { text: '47 up to 50, 83 down to 80 — one up, one down.' },
        { text: '5 × 8 = 40, then put back two zeros: 4,000.' },
        { text: 'About 4,000. (Exact: 3,901.)' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 5051 },
      { difficulty: 1, seed: 5052 },
      { difficulty: 2, seed: 5053 },
    ],
  },
  generate: (difficulty: Difficulty, rng: Rng): ProblemSpec => {
    for (;;) {
      let a: number;
      let b: number;
      if (difficulty === 1) [a, b] = [messy(rng, 12, 99), messy(rng, 12, 99)];
      else if (difficulty === 2) [a, b] = [messy(rng, 101, 999), messy(rng, 12, 99)];
      else [a, b] = rng.chance(0.5) ? [messy(rng, 101, 999), messy(rng, 101, 999)] : [messy(rng, 1001, 9999), messy(rng, 12, 99)];
      const { ra, rb } = productRounding(a, b);
      const answer = a * b;
      const est = ra * rb;
      const tolerance = tenPercentWhole(answer);
      if (Math.abs(est - answer) > tolerance) continue;
      const { prompt, spoken } = phrase('About what is {a} × {b}?', { a: { show: num(a), say: String(a), value: a }, b: { show: num(b), say: String(b), value: b } });
      return { prompt, spoken: spoken.replace(' × ', ' times '), answer, answerKind: 'integer', tolerance, meta: { a, b, ra, rb, est } };
    }
  },
  solve: (problem: Problem): Step[] => {
    const a = metaNum(problem.meta, 'a');
    const b = metaNum(problem.meta, 'b');
    const ra = metaNum(problem.meta, 'ra');
    const rb = metaNum(problem.meta, 'rb');
    const est = metaNum(problem.meta, 'est');
    const opposite = ra > a !== rb > b;
    const [da, db] = [ra / 10 ** zeros(ra), rb / 10 ** zeros(rb)].sort((x, y) => y - x) as [number, number];
    const z = zeros(ra) + zeros(rb);
    return [
      {
        text: 'Round ' + num(a) + ' ' + roundedWord(a, ra) + ' and ' + num(b) + ' ' + roundedWord(b, rb) + '.',
        detail: opposite ? 'One up, one down: the errors cancel.' : 'Both the same way here: the other direction would be further off.',
      },
      { text: num(da) + ' × ' + num(db) + ' = ' + num(da * db) + (z ? ', then put back ' + ZERO_WORDS[z] : '') + ': ' + num(est) + '.' },
      { text: 'So about ' + num(est) + '. ' + exactLine(problem.answer, problem.tolerance ?? 0, num) },
    ];
  },
  constraints: [withinTolerance, { name: 'neither number is a round ten', test: (p) => metaNum(p.meta, 'a') % 10 !== 0 && metaNum(p.meta, 'b') % 10 !== 0 }],
});

// ===================================================================== quotients

/**
 * Plans a ÷ b: round b to one figure, then move a to a "compatible" number that
 * the rounded b divides neatly — so the quotient has one or two figures.
 */
export function quotientPlan(a: number, b: number): { rb: number; ra: number; q: number } | null {
  const exact = a / b;
  // Single digits and the teens are easy to divide by as they are; rounding 12 to 10 is a 17% change.
  const tries = b < 20 ? [b] : Array.from(new Set([nearestOneFigure(b), oneFigure(b, 'down'), oneFigure(b, 'up')]));
  const plans: { rb: number; ra: number; q: number; err: number }[] = [];
  for (const rb of tries) {
    const raw = a / rb;
    for (const figures of [1, 2]) {
      const unit = 10 ** Math.max(0, String(Math.floor(raw)).length - figures);
      const q = Math.max(unit, Math.round(raw / unit) * unit);
      plans.push({ rb, ra: q * rb, q, err: relErr(q, exact) });
    }
  }
  // Simplest first (nearest rounding, one figure); take the first that is good, else the closest.
  const good = plans.find((p) => p.err <= GOOD);
  const best = good ?? plans.reduce((x, y) => (y.err < x.err ? y : x));
  // Past 8% the walkthrough would land at the edge of what counts — the generator picks again.
  if (best.err > 0.08 || Math.abs(best.q - exact) > tenPercent(round2(exact))) return null;
  return { rb: best.rb, ra: best.ra, q: best.q };
}

export const estQuotient = defineSkill({
  id: 'est-quotient',
  title: 'Estimate quotients',
  blurb: 'Round the divisor, then nudge the top to something it divides.',
  category: 'estimate',
  order: 510,
  prereqs: ['divide-1d'],
  answerMode: 'estimate',
  targetSeconds: [8, 12, 18],
  truth: (meta: Meta) => round2(metaNum(meta, 'a') / metaNum(meta, 'b')),
  hint: (problem) => {
    const b = metaNum(problem.meta, 'b');
    return b < 20
      ? 'Nudge ' + num(metaNum(problem.meta, 'a')) + ' to a nearby number that ' + b + ' divides neatly.'
      : 'Round ' + num(b) + ' to one non-zero digit first.';
  },
  lesson: {
    idea: [
      'For a quick quotient, round the number you divide by to one figure. Then nudge the top number to a nearby one that divides neatly, like 8,000 ÷ 40.',
      'Cancel the zeros the two share and divide what is left. Anything within 10% of the exact answer counts.',
    ],
    worked: {
      prompt: 'About what is 7,832 ÷ 38?',
      steps: [
        { text: 'Round 38 to 40.' },
        { text: '7,832 is close to 8,000, which 40 divides neatly.' },
        { text: '8,000 ÷ 40 = 800 ÷ 4 = 200.' },
        { text: 'About 200. (Exact: 206.11.)' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 5101 },
      { difficulty: 2, seed: 5102 },
      { difficulty: 2, seed: 5103 },
    ],
  },
  generate: (difficulty: Difficulty, rng: Rng): ProblemSpec => {
    for (;;) {
      let a: number;
      let b: number;
      if (difficulty === 1) [a, b] = [rng.int(101, 999), rng.int(3, 9)];
      else if (difficulty === 2) [a, b] = [rng.int(1001, 9999), messy(rng, 12, 99)];
      else [a, b] = rng.chance(0.5) ? [rng.int(10001, 99999), messy(rng, 12, 99)] : [rng.int(10001, 99999), messy(rng, 101, 999)];
      if (a % b === 0 || a / b < 10) continue;
      const plan = quotientPlan(a, b);
      if (!plan || plan.ra === a) continue;
      const answer = round2(a / b);
      const { prompt, spoken } = phrase('About what is {a} ÷ {b}?', { a: { show: num(a), say: String(a), value: a }, b: { show: num(b), say: String(b), value: b } });
      return {
        prompt,
        spoken: spoken.replace(' ÷ ', ' divided by '),
        answer,
        answerKind: 'decimal',
        tolerance: tenPercent(answer),
        meta: { a, b, rb: plan.rb, ra: plan.ra, est: plan.q },
      };
    }
  },
  solve: (problem: Problem): Step[] => {
    const a = metaNum(problem.meta, 'a');
    const b = metaNum(problem.meta, 'b');
    const rb = metaNum(problem.meta, 'rb');
    const ra = metaNum(problem.meta, 'ra');
    const q = metaNum(problem.meta, 'est');
    // Cancel shared zeros — unless that would leave "÷ 1", which helps nobody.
    const z = rb === 10 ** zeros(rb) ? 0 : Math.min(zeros(ra), zeros(rb));
    const steps: Step[] = [];
    if (rb !== b) steps.push({ text: 'Round ' + num(b) + ' ' + roundedWord(b, rb) + '.', detail: 'One figure is plenty for an estimate.' });
    steps.push({ text: num(a) + ' is close to ' + num(ra) + ', which ' + num(rb) + ' divides neatly.' });
    steps.push({
      text: num(ra) + ' ÷ ' + num(rb) + (z ? ' = ' + num(ra / 10 ** z) + ' ÷ ' + num(rb / 10 ** z) : '') + ' = ' + num(q) + '.',
      ...(z ? { detail: 'Cancel the zeros they share first.' } : {}),
    });
    steps.push({ text: 'So about ' + num(q) + '. ' + exactLine(problem.answer, problem.tolerance ?? 0, dec) });
    return steps;
  },
  constraints: [withinTolerance, { name: 'never divides exactly', test: (p) => metaNum(p.meta, 'a') % metaNum(p.meta, 'b') !== 0 }],
});

// ===================================================================== square roots

/** √n ≈ s + (n − s²) / 2s, where s² is the nearest perfect square. Rounded to 0.1. */
export function sqrtEstimate(n: number): { s: number; diff: number; nudge: number; est: number } {
  let s = 1;
  while ((s + 1) * (s + 1) <= n) s++;
  if ((s + 1) * (s + 1) - n < n - s * s) s++; // the square above is nearer
  const diff = n - s * s;
  const nudge = Math.round((Math.abs(diff) / (2 * s)) * 10) / 10;
  const est = Math.round((s + Math.sign(diff) * nudge) * 10) / 10;
  return { s, diff, nudge, est };
}

export const estSqrt = defineSkill({
  id: 'est-sqrt',
  title: 'Estimate square roots',
  blurb: 'Nearest perfect square, then a small correction.',
  category: 'estimate',
  order: 515,
  prereqs: ['square-2d'],
  answerMode: 'estimate',
  targetSeconds: [8, 12, 18],
  truth: (meta: Meta) => round2(Math.sqrt(metaNum(meta, 'n'))),
  hint: (problem) => 'Which perfect square is closest to ' + num(metaNum(problem.meta, 'n')) + '?',
  lesson: {
    idea: [
      'Start from the nearest perfect square you know. √70 is a bit more than √64, which is 8.',
      'For the correction, divide how far off you are by twice that root: 70 is 6 past 64, and 6 ÷ 16 is about 0.4. So √70 is about 8.4. Anything within 10% counts, but this lands much closer.',
    ],
    worked: {
      prompt: 'About what is √70?',
      steps: [
        { text: 'Nearest square: 64 = 8².' },
        { text: '70 is 6 above. 6 ÷ (2 × 8) = 6 ÷ 16 ≈ 0.4.' },
        { text: '8 + 0.4 = about 8.4. (Exact: 8.37.)' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 5151 },
      { difficulty: 1, seed: 5152 },
      { difficulty: 2, seed: 5153 },
    ],
  },
  generate: (difficulty: Difficulty, rng: Rng): ProblemSpec => {
    for (;;) {
      const n = difficulty === 1 ? rng.int(11, 99) : difficulty === 2 ? rng.int(101, 999) : rng.int(1001, 9999);
      const r = Math.round(Math.sqrt(n));
      if (r * r === n) continue;
      const answer = round2(Math.sqrt(n));
      return {
        prompt: 'About what is √' + num(n) + '?',
        spoken: 'About what is the square root of ' + n + '?',
        answer,
        answerKind: 'decimal',
        tolerance: tenPercent(answer),
        meta: { n, est: sqrtEstimate(n).est },
      };
    }
  },
  solve: (problem: Problem): Step[] => {
    const n = metaNum(problem.meta, 'n');
    const { s, diff, nudge, est } = sqrtEstimate(n);
    const above = diff > 0;
    return [
      { text: 'Nearest perfect square: ' + num(s * s) + ' = ' + s + '².' },
      {
        text:
          num(n) + ' is ' + Math.abs(diff) + (above ? ' above' : ' below') + ' it. ' + Math.abs(diff) + ' ÷ (2 × ' + s + ') = ' +
          Math.abs(diff) + ' ÷ ' + 2 * s + (nudge === 0 ? ', which is under 0.05 — too small to matter.' : ' ≈ ' + nudge + '.'),
        detail: 'Twice the root is how fast squares grow near ' + s + '.',
      },
      {
        text:
          (nudge === 0 ? 'So about ' + est : s + (above ? ' + ' : ' − ') + nudge + ' = about ' + est) +
          '. ' + exactLine(problem.answer, problem.tolerance ?? 0, dec),
      },
    ];
  },
  constraints: [withinTolerance, { name: 'never a perfect square', test: (p) => !Number.isInteger(Math.sqrt(metaNum(p.meta, 'n'))) }],
});
