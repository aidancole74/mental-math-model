/** Round-then-adjust estimation across the percent track, and the rule of 72. */

import { defineSkill } from '../define';
import { dec, metaNum, money, num, round2 } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';
import { percentOf } from './blocks';
import { estimatePercent, looksLikeAnswer } from './estimatePct';
import { exactLine, m, n, phrase, roundForEstimate, tenPercent } from './phrase';

// ======================================================================= round, then adjust

/** Friendly percents with a block plan, and their awkward neighbours. */
const FRIENDLY_PCTS = [20, 25, 30, 40, 50, 60, 75];

type EstKind = 'of' | 'sale' | 'what';
const EST_KINDS: EstKind[] = ['of', 'sale', 'what'];

/**
 * A number just off a friendly one — 198 near 200, 612 near 610 — within 2%,
 * never exactly on it. Returns both, so the walkthrough rounds to that neighbour.
 */
function nearFriendly(rng: Rng): { x: number; f: number } {
  const f = rng.int(10, 90) * 10;
  const reach = Math.max(1, Math.floor(f * 0.02));
  for (;;) {
    const x = f + rng.int(-reach, reach);
    if (x !== f) return { x, f };
  }
}

function estGenerate(d: Difficulty, rng: Rng): ProblemSpec {
  const kind: EstKind = d === 3 ? rng.pick(EST_KINDS) : 'of';

  if (kind === 'of') {
    const friendlyP = rng.pick(FRIENDLY_PCTS);
    const p = d === 1 ? friendlyP : friendlyP + rng.pick([-1, 1]);
    const { x, f } = nearFriendly(rng);
    const answer = round2((p * x) / 100);
    const est = percentOf(friendlyP, f).value;
    const { prompt, spoken } = phrase('About what is {p}% of {x}?', { p: n(p), x: n(x) });
    return { prompt, spoken, answer, answerKind: 'decimal', tolerance: tenPercent(answer), meta: { kind: 0, p, fp: friendlyP, x, fx: f, est } };
  }
  if (kind === 'sale') {
    const off = rng.pick([15, 20, 25, 30, 35, 40]);
    const price = round2(rng.int(20, 300) - rng.pick([0.01, 0.05]));
    const answer = round2((price * (100 - off)) / 100);
    const est = percentOf(100 - off, roundForEstimate(price)).value;
    const { prompt, spoken } = phrase('About what do you pay for an item marked {x} at {p}% off?', { x: m(price), p: n(off) });
    return { prompt, spoken, answer, answerKind: 'money', unit: '$', tolerance: tenPercent(answer), meta: { kind: 1, p: off, fp: off, x: price, fx: roundForEstimate(price), est } };
  }
  let whole: number;
  let part: number;
  let answer: number;
  do {
    whole = rng.int(40, 400);
    part = rng.int(Math.ceil(whole * 0.15), Math.floor(whole * 0.95));
    answer = round2((part / whole) * 100);
  } while (looksLikeAnswer(answer, [part, whole, whole / 10]));
  const { prompt, spoken } = phrase('About what percent of {w} is {part}?', { w: n(whole), part: n(part) });
  return {
    prompt,
    spoken,
    answer,
    answerKind: 'decimal',
    suffix: '%',
    tolerance: tenPercent(answer),
    meta: { kind: 2, p: part, fp: 0, x: whole, fx: whole, est: estimatePercent(part, whole).estimate },
  };
}

function estSolve(problem: Problem): Step[] {
  const kind = EST_KINDS[metaNum(problem.meta, 'kind')] as EstKind;
  const p = metaNum(problem.meta, 'p');
  const fp = metaNum(problem.meta, 'fp');
  const x = metaNum(problem.meta, 'x');
  const tol = problem.tolerance ?? 0;

  if (kind === 'what') {
    return [...estimatePercent(p, x).steps, { text: exactLine(problem.answer, tol, (v) => dec(v) + '%') }];
  }
  const r = metaNum(problem.meta, 'fx');
  if (kind === 'sale') {
    const work = percentOf(100 - fp, r);
    return [
      { text: 'Round ' + money(x) + ' to ' + money(r) + '. ' + fp + '% off means you pay ' + (100 - fp) + '%.' },
      ...work.steps,
      { text: 'So about ' + money(work.value) + '. ' + exactLine(problem.answer, tol, money) },
    ];
  }
  const work = percentOf(fp, r);
  const roundText =
    p === fp ? 'Round ' + num(x) + ' to ' + num(r) + '.' : 'Round to friendly numbers: ' + p + '% → ' + fp + '%, ' + num(x) + ' → ' + num(r) + '.';
  return [
    { text: roundText, detail: 'Small nudges like these move the answer by only a few percent.' },
    ...work.steps,
    { text: 'So about ' + dec(work.value) + '. ' + exactLine(problem.answer, tol, dec) },
  ];
}

export const pctEstimate = defineSkill({
  id: 'pct-estimate',
  title: 'Estimate any percent',
  blurb: 'Round to friendly numbers, then use your blocks.',
  category: 'percent',
  order: 260,
  prereqs: ['pct-tips', 'pct-discount'],
  answerMode: 'estimate',
  targetSeconds: [10, 15, 20],
  truth: (meta: Meta) => {
    const kind = metaNum(meta, 'kind');
    const p = metaNum(meta, 'p');
    const x = metaNum(meta, 'x');
    if (kind === 1) return round2((x * (100 - p)) / 100);
    if (kind === 2) return round2((p / x) * 100);
    return round2((p * x) / 100);
  },
  lesson: {
    idea: [
      'Real numbers are messy: 31% of 198, or $59.99 at 35% off. Nudge each number to its nearest friendly neighbour, then use your blocks.',
      'Small nudges barely matter. Moving 198 to 200 changes the answer by 1%. Here, anything within 10% of the exact answer counts.',
    ],
    worked: {
      prompt: 'About what is 31% of 198?',
      steps: [
        { text: 'Round: 31% → 30%, 198 → 200.' },
        { text: '10% of 200 is 20, so 30% is 60.' },
        { text: 'About 60. (Exact: 61.38.)' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 8101 },
      { difficulty: 2, seed: 8102 },
      { difficulty: 2, seed: 8103 },
    ],
  },
  generate: estGenerate,
  solve: estSolve,
  constraints: [
    {
      name: 'the walkthrough’s own estimate is within 10%',
      test: (p) => Math.abs(metaNum(p.meta, 'est') - p.answer) <= (p.tolerance ?? 0) + 1e-9,
    },
    { name: 'every prompt says it is an estimate', test: (p) => p.prompt.startsWith('About') },
    { name: 'difficulty 1 percents are already friendly', difficulty: 1, test: (p) => metaNum(p.meta, 'p') === metaNum(p.meta, 'fp') },
  ],
});

// ======================================================================= rule of 72

type R72Kind = 'years' | 'rate' | 'grow';
const R72_KINDS: R72Kind[] = ['years', 'rate', 'grow'];
const DIVISORS = [2, 3, 4, 6, 8, 9, 12];

function r72Generate(d: Difficulty, rng: Rng): ProblemSpec {
  const kind: R72Kind = d === 1 ? 'years' : d === 2 ? rng.pick<R72Kind>(['years', 'rate']) : rng.pick<R72Kind>(['years', 'grow']);

  if (kind === 'years') {
    const r = d === 3 ? rng.pick([5, 7, 10, 11, 15]) : rng.pick(DIVISORS);
    const answer = round2(72 / r);
    const { prompt, spoken } = phrase('About how many years does money take to double at {r}% a year?', { r: n(r) });
    return { prompt, spoken, answer, answerKind: 'decimal', suffix: ' years', tolerance: tenPercent(answer), meta: { kind: 0, r, y: 0, x: 0 } };
  }
  if (kind === 'rate') {
    const y = rng.pick([6, 8, 9, 12, 18, 24]);
    const answer = 72 / y;
    const { prompt, spoken } = phrase('About what yearly growth doubles your money in {y} years?', { y: n(y) });
    return { prompt, spoken, answer, answerKind: 'decimal', suffix: '%', tolerance: tenPercent(answer), meta: { kind: 1, r: 0, y, x: 0 } };
  }
  const r = rng.pick([4, 6, 8, 9, 12]);
  const doublings = rng.int(1, 3);
  const y = (72 / r) * doublings;
  const x = rng.pick([500, 1000, 2000, 5000]);
  const answer = x * 2 ** doublings;
  const { prompt, spoken } = phrase('About what is {x} worth after {y} years at {r}% a year?', { x: m(x), y: n(y), r: n(r) });
  return { prompt, spoken, answer, answerKind: 'money', unit: '$', tolerance: tenPercent(answer), meta: { kind: 2, r, y, x } };
}

function r72Solve(problem: Problem): Step[] {
  const kind = R72_KINDS[metaNum(problem.meta, 'kind')] as R72Kind;
  const r = metaNum(problem.meta, 'r');
  const y = metaNum(problem.meta, 'y');
  const x = metaNum(problem.meta, 'x');
  const tol = problem.tolerance ?? 0;
  if (kind === 'years') {
    const exact = Number.isInteger(72 / r);
    return [
      { text: 'Rule of 72: divide 72 by the yearly rate.', detail: 'It works for growth rates from about 2% to 20%.' },
      exact
        ? { text: '72 ÷ ' + r + ' = ' + dec(problem.answer) + ', so it doubles in about ' + dec(problem.answer) + ' years.' }
        : {
            text: '72 ÷ ' + r + ' is a bit more than ' + Math.floor(72 / r) + '. ' + exactLine(problem.answer, tol, (v) => dec(v) + ' years'),
          },
    ];
  }
  if (kind === 'rate') {
    return [
      { text: 'Run the rule of 72 backwards: divide 72 by the number of years.' },
      { text: '72 ÷ ' + y + ' = ' + dec(problem.answer) + ', so you need about ' + dec(problem.answer) + '% a year.' },
    ];
  }
  const each = 72 / r;
  const doublings = y / each;
  const chain = Array.from({ length: doublings + 1 }, (_, i) => money(x * 2 ** i)).join(' → ');
  return [
    { text: 'At ' + r + '% a year, money doubles about every 72 ÷ ' + r + ' = ' + each + ' years.' },
    { text: y + ' years is ' + doublings + (doublings === 1 ? ' doubling' : ' doublings') + ': ' + chain + '.' },
    { text: 'So about ' + money(problem.answer) + '.', detail: 'The real figure is a little different — the rule is a shortcut, which is why this is an estimate.' },
  ];
}

export const pctRule72 = defineSkill({
  id: 'pct-rule72',
  title: 'Rule of 72',
  blurb: 'Years to double ≈ 72 ÷ yearly growth rate.',
  category: 'percent',
  order: 265,
  prereqs: ['pct-change'],
  answerMode: 'estimate',
  targetSeconds: [8, 12, 20],
  truth: (meta: Meta) => {
    const kind = metaNum(meta, 'kind');
    if (kind === 0) return round2(72 / metaNum(meta, 'r'));
    if (kind === 1) return 72 / metaNum(meta, 'y');
    return metaNum(meta, 'x') * 2 ** ((metaNum(meta, 'y') * metaNum(meta, 'r')) / 72);
  },
  lesson: {
    idea: [
      'Anything growing by a steady percent each year doubles in about 72 ÷ (the rate) years. At 6% a year, that is 72 ÷ 6 = 12 years.',
      'It runs backwards too: to double in 9 years you need about 72 ÷ 9 = 8% a year. And it chains: 24 years at 6% is two doublings — four times the money.',
    ],
    worked: {
      prompt: 'At 6% a year, how long to double?',
      steps: [
        { text: 'Rule of 72: 72 ÷ 6 = 12.' },
        { text: 'So about 12 years.' },
        { text: '$1,000 for 24 years at 6% → two doublings → $1,000 → $2,000 → $4,000.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 8201 },
      { difficulty: 1, seed: 8202 },
      { difficulty: 2, seed: 8203 },
    ],
  },
  generate: r72Generate,
  solve: r72Solve,
  hint: (p) => {
    const kind = metaNum(p.meta, 'kind');
    if (kind === 0) return 'Divide 72 by the yearly rate.';
    if (kind === 1) return 'Divide 72 by the number of years.';
    return 'First work out how many years one doubling takes.';
  },
  constraints: [
    { name: 'every prompt says it is an estimate', test: (p) => p.prompt.startsWith('About') },
    { name: 'growth problems span whole doublings', test: (p) => metaNum(p.meta, 'kind') !== 2 || Number.isInteger((metaNum(p.meta, 'y') * metaNum(p.meta, 'r')) / 72) },
  ],
});
