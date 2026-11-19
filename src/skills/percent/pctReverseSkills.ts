/** Working backwards: find the whole, find the percent, percent change. */

import { defineSkill } from '../define';
import { dec, metaNum, money, num, round2 } from '../helpers';
import type { Constraint, Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';
import { estimatePercent, looksLikeAnswer } from './estimatePct';
import { percentOf } from './blocks';
import { exactLine, m, n, phrase, tenPercent } from './phrase';

const TARGETS: [number, number, number] = [10, 15, 20];

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

const pctFmt = (v: number): string => dec(v) + '%';

const estimateAnnounced: Constraint = {
  name: 'estimate prompts start with "About"',
  test: (p) => (p.tolerance !== undefined) === p.prompt.startsWith('About'),
};

const estimateLands: Constraint = {
  name: 'the walkthrough’s own estimate is within 10%',
  test: (p) => p.tolerance === undefined || Math.abs(metaNum(p.meta, 'est') - p.answer) <= p.tolerance + 1e-9,
};

/**
 * part/whole as a whole-number percent, by simplifying and scaling to
 * hundredths. Only valid when the answer is a whole number.
 */
export function fractionToPercent(part: number, whole: number): { p: number; steps: Step[] } {
  const g = gcd(part, whole);
  const nn = part / g;
  const dd = whole / g;
  if (100 % dd !== 0) throw new Error(part + '/' + whole + ' is not a whole percent');
  const p = (nn * 100) / dd;
  const steps: Step[] = [{ text: 'Write it as a fraction: ' + num(part) + '/' + num(whole) + '.' }];
  if (g > 1) steps.push({ text: 'Simplify: ' + nn + '/' + dd + '.' });
  steps.push(
    dd === 100
      ? { text: 'That is already hundredths: ' + p + '%.' }
      : {
          text: 'Scale to hundredths: ' + nn + '/' + dd + ' = ' + p + '/100 = ' + p + '%.',
          detail: 'Multiply top and bottom by ' + 100 / dd + '.',
        },
  );
  return { p, steps };
}

// ======================================================================= find the whole

const WHOLE_STEP: Record<number, number> = { 50: 2, 25: 4, 20: 5, 10: 10, 5: 20, 75: 4, 40: 5, 30: 10, 60: 5, 15: 20, 12: 25, 35: 20, 80: 5, 2: 50, 4: 25 };
const WHOLE_PCTS: Record<Difficulty, number[]> = { 1: [50, 25, 20, 10], 2: [5, 75, 40, 30, 60], 3: [15, 12, 35, 80, 2, 4] };

function wholeGenerate(d: Difficulty, rng: Rng): ProblemSpec {
  const p = rng.pick(WHOLE_PCTS[d]);
  const step = WHOLE_STEP[p] as number;
  const whole = step * rng.int(Math.max(2, Math.ceil(20 / step)), Math.max(3, Math.floor(400 / step)));
  const part = (whole * p) / 100;
  const ctx = rng.chance(0.4) ? ([10, 15, 20, 25].includes(p) ? rng.int(1, 2) : 2) : 0;
  const template = [
    '{part} is {p}% of what?',
    '{An:part} {part-} tip was {p}% of the bill. How big was the bill?',
    'You saved {part} with {an:p} {p}% discount. What was the original price?',
  ][ctx] as string;
  const { prompt, spoken } = phrase(template, { part: ctx ? m(part) : n(part), p: n(p) });
  return {
    prompt,
    spoken,
    answer: whole,
    answerKind: ctx ? 'money' : 'integer',
    ...(ctx ? { unit: '$' } : {}),
    meta: { p, part, ctx },
  };
}

function wholeSolve(problem: Problem): Step[] {
  const p = metaNum(problem.meta, 'p');
  const part = metaNum(problem.meta, 'part');
  const g = gcd(p, 100);
  const W = problem.answer;
  const steps: Step[] =
    g === p
      ? [
          { text: p + '% fits into 100% exactly ' + 100 / p + ' times.', detail: 'So the whole is ' + 100 / p + ' copies of the part.' },
          { text: 'The whole is ' + num(part) + ' × ' + 100 / p + ' = ' + num(W) + '.' },
        ]
      : [
          {
            text: p + '% is ' + p / g + ' lots of ' + g + '%, so ' + g + '% is ' + num(part) + ' ÷ ' + p / g + ' = ' + dec(round2((part * g) / p)) + '.',
          },
          { text: '100% is ' + 100 / g + ' lots of ' + g + '%: ' + dec(round2((part * g) / p)) + ' × ' + 100 / g + ' = ' + num(W) + '.' },
        ];
  const ctx = metaNum(problem.meta, 'ctx');
  if (ctx === 1) steps.push({ text: 'So the bill was ' + money(W) + '.' });
  if (ctx === 2) steps.push({ text: 'So the original price was ' + money(W) + '.' });
  return steps;
}

export const pctWhole = defineSkill({
  id: 'pct-whole',
  title: 'Find the whole',
  blurb: '“20 is 25% of what?” Scale the part up to 100%.',
  category: 'percent',
  order: 245,
  prereqs: ['pct-20-25-50'],
  targetSeconds: TARGETS,
  truth: (meta: Meta) => (metaNum(meta, 'part') * 100) / metaNum(meta, 'p'),
  lesson: {
    idea: [
      'When you know a piece and its percent, scale the piece up to 100%. If 25% is 20, then 100% — four times as much — is 80.',
      'When the percent doesn’t go into 100 neatly, step down to a block first: if 30% is 18, then 10% is 6, and 100% is 60.',
    ],
    worked: {
      prompt: '18 is 30% of what?',
      steps: [
        { text: '30% is three lots of 10%, so 10% is 18 ÷ 3 = 6.' },
        { text: '100% is ten lots of 10%: 6 × 10 = 60.' },
        { text: 'Quick check: 30% of 60 is 18. ✓' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 7101 },
      { difficulty: 1, seed: 7102 },
      { difficulty: 2, seed: 7103 },
    ],
  },
  generate: wholeGenerate,
  solve: wholeSolve,
  constraints: [
    { name: 'the part and the whole are whole numbers', test: (p) => Number.isInteger(p.answer) && Number.isInteger(metaNum(p.meta, 'part')) },
    { name: 'the part really is p% of the whole', test: (p) => (p.answer * metaNum(p.meta, 'p')) / 100 === metaNum(p.meta, 'part') },
  ],
});

// ======================================================================= what percent?

const FRACTIONS: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10]];

function whatGenerate(d: Difficulty, rng: Rng): ProblemSpec {
  if (d === 3) {
    let whole: number;
    let part: number;
    let answer: number;
    do {
      whole = rng.int(40, 400);
      part = rng.int(Math.ceil(whole * 0.15), Math.floor(whole * 0.95));
      answer = round2((part / whole) * 100);
    } while (looksLikeAnswer(answer, [part, whole, whole / 10]));
    const { prompt, spoken } = phrase('About what percent of {w} is {part}?', { w: n(whole), part: n(part) });
    return { prompt, spoken, answer, answerKind: 'decimal', suffix: '%', tolerance: tenPercent(answer), meta: { part, whole, ctx: 0, est: estimatePercent(part, whole).estimate } };
  }
  for (;;) {
    let part: number;
    let whole: number;
    if (d === 1) {
      const [nn, dd] = rng.pick(FRACTIONS);
      const k = rng.int(Math.ceil(10 / dd), Math.floor(200 / dd));
      whole = dd * k;
      part = nn * k;
    } else {
      const p = rng.int(1, 19) * 5;
      whole = rng.int(1, 15) * 20;
      part = (p * whole) / 100;
    }
    const p = (part * 100) / whole;
    // Skip lookalikes where the answer already appears in the question (20 of 100 is 20%).
    if (whole === 100 || part === p || whole === p || part === 0) continue;
    const ctx = rng.int(0, 2);
    const template = [
      'What percent of {w} is {part}?',
      'You got {part} out of {w} on a quiz. What percent is that?',
      '{An:part} {part-} discount on {an:w} {w-} item. What percent off is that?',
    ][ctx] as string;
    const money2 = ctx === 2;
    const { prompt, spoken } = phrase(template, { w: money2 ? m(whole) : n(whole), part: money2 ? m(part) : n(part) });
    return { prompt, spoken, answer: p, answerKind: 'integer', suffix: '%', meta: { part, whole, ctx } };
  }
}

function whatSolve(problem: Problem): Step[] {
  const part = metaNum(problem.meta, 'part');
  const whole = metaNum(problem.meta, 'whole');
  if (problem.tolerance !== undefined) {
    return [...estimatePercent(part, whole).steps, { text: exactLine(problem.answer, problem.tolerance, pctFmt) }];
  }
  return fractionToPercent(part, whole).steps;
}

export const pctWhat = defineSkill({
  id: 'pct-what',
  title: 'What percent is it?',
  blurb: 'Make a fraction, simplify, scale to hundredths.',
  category: 'percent',
  order: 250,
  prereqs: ['pct-whole'],
  targetSeconds: TARGETS,
  truth: (meta: Meta) => round2((metaNum(meta, 'part') / metaNum(meta, 'whole')) * 100),
  lesson: {
    idea: [
      '“What percent is 12 of 48?” is a fraction question: 12/48. Simplify it, then stretch it to hundredths — percent just means “out of 100”.',
      'When the numbers are messy, measure with 10%: find 10% of the whole and see how many of them fit into the part.',
    ],
    worked: {
      prompt: 'What percent of 48 is 12?',
      steps: [
        { text: 'Write it as a fraction: 12/48.' },
        { text: 'Simplify: 1/4.' },
        { text: 'Scale to hundredths: 1/4 = 25/100 = 25%.' },
        { text: 'Messy one: 37 of 81 → 10% is 8.1, four of those is 32.4, plus about 6% more → roughly 46%.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 7201 },
      { difficulty: 1, seed: 7202 },
      { difficulty: 2, seed: 7203 },
    ],
  },
  generate: whatGenerate,
  solve: whatSolve,
  constraints: [
    estimateAnnounced,
    estimateLands,
    { name: 'exact answers are whole percents', test: (p) => p.tolerance !== undefined || Number.isInteger(p.answer) },
    { name: 'difficulty 3 is an estimate', difficulty: 3, test: (p) => p.tolerance !== undefined },
  ],
});

// ======================================================================= percent change

type ChangeKind = 'up' | 'down' | 'up-down' | 'down-up' | 'estimate';
const CHANGE_KINDS: ChangeKind[] = ['up', 'down', 'up-down', 'down-up', 'estimate'];

function changeGenerate(d: Difficulty, rng: Rng): ProblemSpec {
  if (d === 3) {
    for (;;) {
      const a = rng.int(40, 400);
      if (a === 100) continue; // from $100 the change IS the percent
      const r = rng.int(10, 60) / 100;
      const up = rng.chance(0.5);
      const b = Math.round(a * (up ? 1 + r : 1 - r));
      const diff = Math.abs(b - a);
      if (diff === 0) continue;
      const answer = round2((diff / a) * 100);
      if (looksLikeAnswer(answer, [a, b, diff, a / 10])) continue;
      const { prompt, spoken } = phrase(
        up ? 'About what percent did the price rise, from {a} to {b}?' : 'About what percent did the price fall, from {a} to {b}?',
        { a: m(a), b: m(b) },
      );
      return {
        prompt,
        spoken,
        answer,
        answerKind: 'decimal',
        suffix: '%',
        tolerance: tenPercent(answer),
        meta: { kind: 4, a, b, p: 0, est: estimatePercent(diff, a).estimate },
      };
    }
  }
  const twoStep = d === 2 && rng.chance(0.35);
  if (twoStep) {
    const p = rng.pick([50, 20, 10, 25]);
    const a = rng.int(1, 10) * 100;
    const upFirst = rng.chance(0.6);
    const answer = round2(a * (1 + p / 100) * (1 - p / 100));
    const { prompt, spoken } = phrase(
      upFirst
        ? '{An:a} {a-} stock rises {p}%, then falls {p}%. What is it worth now?'
        : '{An:a} {a-} bike drops {p}% in price, then goes back up {p}%. What does it cost now?',
      { a: m(a), p: n(p) },
    );
    return { prompt, spoken, answer, answerKind: 'money', unit: '$', meta: { kind: upFirst ? 2 : 3, a, b: 0, p } };
  }
  for (;;) {
    const p = d === 1 ? rng.pick([10, 20, 25, 50]) : rng.pick([5, 15, 30, 40, 75]);
    const step = d === 1 ? (p === 25 ? 4 : p === 50 ? 2 : 10) : 20;
    const a = step * rng.int(Math.ceil(20 / step), Math.floor(400 / step));
    if (a === 100) continue; // the change would equal the percent — no thinking needed
    const up = p === 75 ? true : rng.chance(0.5);
    const b = up ? a + (a * p) / 100 : a - (a * p) / 100;
    // Skip giveaways: $20 → $25 is "25%", $40 → $24 is "40%".
    if (p === a || p === b) continue;
    const { prompt, spoken } = phrase(
      up ? '{An:a} {a-} shirt now costs {b}. By what percent did the price go up?' : 'Rent drops from {a} to {b}. By what percent did it fall?',
      { a: m(a), b: m(b) },
    );
    return { prompt, spoken, answer: p, answerKind: 'integer', suffix: '%', meta: { kind: up ? 0 : 1, a, b, p } };
  }
}

function changeSolve(problem: Problem): Step[] {
  const kind = CHANGE_KINDS[metaNum(problem.meta, 'kind')] as ChangeKind;
  const a = metaNum(problem.meta, 'a');
  const b = metaNum(problem.meta, 'b');
  const p = metaNum(problem.meta, 'p');

  if (kind === 'up-down' || kind === 'down-up') {
    const first = percentOf(p, a).value;
    const mid = kind === 'up-down' ? a + first : a - first;
    const second = round2((mid * p) / 100);
    return [
      { text: (kind === 'up-down' ? 'Up ' : 'Down ') + p + '%: ' + p + '% of ' + num(a) + ' is ' + dec(first) + ', so it is now ' + dec(mid) + '.' },
      { text: (kind === 'up-down' ? 'Down ' : 'Up ') + p + '% of the NEW price: ' + p + '% of ' + dec(mid) + ' is ' + dec(second) + '.' },
      {
        text: 'So it ends at ' + dec(mid) + (kind === 'up-down' ? ' − ' : ' + ') + dec(second) + ' = ' + money(problem.answer) + '.',
        detail: 'Not back to ' + money(a) + ': the second change is a percent of a different number.',
      },
    ];
  }
  const diff = Math.abs(b - a);
  const change: Step = {
    text: 'The change is ' + money(Math.max(a, b)) + ' − ' + money(Math.min(a, b)) + ' = ' + money(diff) + '.',
    detail: 'Always compare the change to where you started.',
  };
  if (kind === 'estimate') {
    return [change, ...estimatePercent(diff, a).steps, { text: exactLine(problem.answer, problem.tolerance ?? 0, pctFmt) }];
  }
  return [change, ...fractionToPercent(diff, a).steps];
}

export const pctChange = defineSkill({
  id: 'pct-change',
  title: 'Percent change',
  blurb: 'Change ÷ start. And why up 50%, down 50% isn’t a wash.',
  category: 'percent',
  order: 255,
  prereqs: ['pct-what'],
  targetSeconds: [12, 18, 25],
  truth: (meta: Meta) => {
    const kind = metaNum(meta, 'kind');
    const a = metaNum(meta, 'a');
    const b = metaNum(meta, 'b');
    const p = metaNum(meta, 'p');
    if (kind === 2 || kind === 3) return round2(a * (1 + p / 100) * (1 - p / 100));
    return round2((Math.abs(b - a) / a) * 100);
  },
  lesson: {
    idea: [
      'Percent change is the change divided by where you started. From $40 to $50 is a $10 change on $40: 10/40 = 25%.',
      'Watch out for back-to-back changes. Up 50% then down 50% does NOT get you back: $100 → $150 → $75. The drop is half of the bigger number.',
    ],
    worked: {
      prompt: '$40 → $50: percent increase?',
      steps: [
        { text: 'The change is $50 − $40 = $10.' },
        { text: 'Compare it to the start: 10/40 = 1/4 = 25%.' },
        { text: 'The trap: $100 up 50% is $150. Down 50% of $150 is $75 — not $100.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 7301 },
      { difficulty: 1, seed: 7302 },
      { difficulty: 2, seed: 7306 },
    ],
  },
  generate: changeGenerate,
  solve: changeSolve,
  constraints: [
    estimateAnnounced,
    estimateLands,
    { name: 'difficulty 1 is a single change by 10, 20, 25 or 50%', difficulty: 1, test: (p) => [10, 20, 25, 50].includes(p.answer) },
    { name: 'difficulty 3 is an estimate', difficulty: 3, test: (p) => p.tolerance !== undefined },
    {
      name: 'the answer is never one of the prices in the question',
      test: (p) => metaNum(p.meta, 'kind') >= 2 || (Math.round(p.answer) !== metaNum(p.meta, 'a') && Math.round(p.answer) !== metaNum(p.meta, 'b')),
    },
    {
      name: 'single changes never start from exactly $100',
      test: (p) => [2, 3].includes(metaNum(p.meta, 'kind')) || metaNum(p.meta, 'a') !== 100,
    },
  ],
});
