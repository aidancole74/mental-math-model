/** 1%; 20/25/50%; combining blocks; the flip trick. */

import { defineSkill } from '../define';
import { dec, metaNum, num, round2 } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';
import { percentOfSkill, type Context } from './percentOfSkill';

const WORD_TARGETS: [number, number, number] = [8, 12, 18];

// ---------------------------------------------------------------- 1%

export const pct1 = percentOfSkill({
  id: 'pct-1',
  title: '1% and its friends',
  blurb: '1% is two decimal places. Build 2%, 3%, 9%, 11% from it.',
  order: 205,
  prereqs: ['pct-basics'],
  targetSeconds: WORD_TARGETS,
  lesson: {
    idea: [
      '1% of anything is the number with its decimal point moved two places left. 1% of 450 is 4.5.',
      'Double it for 2%, triple it for 3%. With 10% beside it you also get 9% (10% minus 1%) and 11% (10% plus 1%) almost for free.',
    ],
    worked: {
      prompt: '3% of 450',
      steps: [
        { text: '1% of 450: move the decimal point two places left → 4.5.' },
        { text: '3% is three of those: 3 × 4.5 = 13.5.' },
        { text: 'Mixing blocks: 9% of 450 = 10% − 1% = 45 − 4.5 = 40.5.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 5101 },
      { difficulty: 1, seed: 5102 },
      { difficulty: 2, seed: 5103 },
    ],
  },
  pick: (d, rng) => {
    if (d === 1) return { p: rng.int(1, 4), x: rng.int(2, 15) * 100 };
    if (d === 2) {
      let x = rng.int(21, 999);
      while (x % 100 === 0) x = rng.int(21, 999);
      return { p: rng.int(1, 4), x };
    }
    return { p: rng.pick([6, 7, 8, 9, 11, 12]), x: rng.int(20, 999) };
  },
  contexts: () => [
    { t: 'Your {x-} savings earn {p}% interest this year. How much is that?', close: 'So you earn {a}.' },
    { t: 'A card charges {an:p} {p}% fee on {an:x} {x-} payment. How much is the fee?', close: 'So the fee is {a}.' },
  ],
  contextChance: [0.3, 0.4, 0.5],
  constraints: [
    { name: 'difficulty 1 answers are whole numbers', difficulty: 1, test: (p) => Number.isInteger(p.answer) },
    { name: 'difficulty 3 needs two blocks', difficulty: 3, test: (p) => ![1, 2, 3, 4].includes(metaNum(p.meta, 'p')) },
  ],
});

// ---------------------------------------------------------------- 20 / 25 / 50

const QUARTERS: Record<number, Context[]> = {
  50: [{ t: 'You split {an:x} {x-} bill 50/50. What is your half?', close: 'So you pay {a}.' }],
  25: [{ t: '{An:x} {x-} coat is {p}% off. How much do you save?', close: 'So you save {a}.' }],
  20: [{ t: 'You put {p}% of {an:x} {x-} paycheck into savings. How much is that?', close: 'So you save {a}.' }],
  75: [{ t: 'Insurance covers {p}% of {an:x} {x-} bill. How much does it cover?', close: 'So it covers {a}.' }],
};

export const pctQuarters = percentOfSkill({
  id: 'pct-20-25-50',
  title: '50%, 25%, 20% and 75%',
  blurb: 'Halve, halve again, or double 10%.',
  order: 210,
  prereqs: ['pct-basics'],
  targetSeconds: WORD_TARGETS,
  lesson: {
    idea: [
      'Some percentages are just fractions in disguise. 50% is a half, 25% is a quarter (half of a half), and 75% is three quarters.',
      '20% is double 10% — or a fifth, if dividing by 5 is easier for you.',
    ],
    worked: {
      prompt: '75% of 84',
      steps: [
        { text: '50% is half: 84 ÷ 2 = 42.' },
        { text: '25% is half of that again: 42 ÷ 2 = 21.' },
        { text: '75% = 50% + 25%: 42 + 21 = 63.' },
        { text: 'And 20% of 84? 10% is 8.4, doubled is 16.8.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 5201 },
      { difficulty: 1, seed: 5202 },
      { difficulty: 2, seed: 5204 },
    ],
  },
  pick: (d, rng) => {
    if (d === 1) {
      const p = rng.pick([50, 25, 20]);
      const x = p === 50 ? rng.int(10, 150) * 2 : p === 25 ? rng.int(5, 100) * 4 : rng.int(2, 40) * 10;
      return { p, x };
    }
    if (d === 2) return { p: rng.pick([50, 25, 20, 75]), x: rng.int(21, 399) };
    return { p: rng.pick([75, 25, 20]), x: rng.int(100, 999) };
  },
  contexts: (p) => QUARTERS[p] ?? [],
  contextChance: [0.4, 0.5, 0.6],
  constraints: [
    { name: 'difficulty 1 answers are whole numbers', difficulty: 1, test: (p) => Number.isInteger(p.answer) },
    { name: 'percent is 50, 25, 20 or 75', test: (p) => [50, 25, 20, 75].includes(metaNum(p.meta, 'p')) },
  ],
});

// ---------------------------------------------------------------- combining blocks

function combineContexts(p: number): Context[] {
  if (p <= 45 && p >= 30) {
    return [{ t: '{An:x} {x-} jacket is {p}% off. How much do you save?', close: 'So you save {a}.' }];
  }
  if (p >= 55) {
    return [
      { t: 'You have paid off {p}% of {an:x} {x-} loan. How much is that?', close: 'So you have paid {a}.' },
      { t: '{An:x} {x-} bike keeps {p}% of its value after a year. What is it worth?', close: 'So it is worth {a}.' },
    ];
  }
  return [{ t: 'Your {x-} rent goes up {p}%. How much more is that?', close: 'So it goes up {a}.' }];
}

export const pctCombine = percentOfSkill({
  id: 'pct-combine',
  title: 'Build any percent from blocks',
  blurb: '35% = 30% + 5%. 90% = all of it minus 10%.',
  order: 215,
  prereqs: ['pct-basics', 'pct-20-25-50'],
  targetSeconds: WORD_TARGETS,
  lesson: {
    idea: [
      'Most percentages are a few blocks glued together. 30% is three 10%s. 35% is that plus a 5%. 45% is 50% minus 5%.',
      'For big ones, count down from the whole: 90% is everything minus 10%, 80% is everything minus 20%. Pick whichever needs fewer steps.',
    ],
    worked: {
      prompt: '35% of 84',
      steps: [
        { text: '10% of 84 is 8.4, so 30% is 3 × 8.4 = 25.2.' },
        { text: '5% is half of 10%: 4.2.' },
        { text: '35% = 30% + 5%: 25.2 + 4.2 = 29.4.' },
        { text: 'Counting down: 90% of 70 = 70 − 7 = 63.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 5301 },
      { difficulty: 2, seed: 5302 },
      { difficulty: 2, seed: 5303 },
    ],
  },
  pick: (d, rng) => {
    if (d === 1) return { p: rng.pick([30, 40]), x: rng.int(2, 50) * 10 };
    if (d === 2) return { p: rng.pick([35, 45, 60, 70, 80, 90]), x: rng.int(20, 400) };
    return { p: rng.pick([12, 18, 55, 65, 85, 95]), x: rng.int(20, 999) };
  },
  contexts: combineContexts,
  contextChance: [0.3, 0.5, 0.5],
  constraints: [
    { name: 'difficulty 1 answers are whole numbers', difficulty: 1, test: (p) => Number.isInteger(p.answer) },
  ],
});

// ---------------------------------------------------------------- the flip trick

/**
 * x% of F = F% of x. The prompt shows the awkward way round ("8% of 50");
 * the friendly F makes the flipped version easy ("50% of 8").
 * meta: { x, f }.
 */

const FLIP_FRIENDLY: Record<Difficulty, number[]> = { 1: [50, 25], 2: [20, 75, 200, 300, 40], 3: [50, 25, 75, 150, 250] };

function flipPick(d: Difficulty, rng: Rng): { x: number; f: number } {
  const f = rng.pick(FLIP_FRIENDLY[d]);
  const boring = new Set([1, 10, 20, 25, 50, 100, f]);
  for (;;) {
    let x: number;
    if (d === 3) x = rng.int(3, 99);
    else if (f === 50) x = rng.int(2, 49) * 2;
    else if (f === 25 || f === 75) x = rng.int(1, 24) * 4;
    else if (f === 20 || f === 40) x = rng.int(1, 19) * 5;
    else if (f === 200) x = rng.int(3, 49);
    else x = rng.int(3, 33);
    if (!boring.has(x)) return { x, f };
  }
}

/** How to take F% of x, in words, and the result. */
export function friendlyPercent(f: number, x: number): { how: string; value: number } {
  const v = round2((f * x) / 100);
  const ways: Record<number, string> = {
    50: 'half of ' + num(x),
    25: 'a quarter of ' + num(x) + ': halve it twice',
    75: 'three quarters of ' + num(x) + ': a quarter is ' + dec(round2(x / 4)) + ', times 3',
    20: 'a fifth of ' + num(x) + ': ' + num(x) + ' ÷ 5',
    40: 'two fifths of ' + num(x) + ': a fifth is ' + dec(round2(x / 5)) + ', doubled',
    150: num(x) + ' plus half of it: ' + num(x) + ' + ' + dec(round2(x / 2)),
    200: 'double ' + num(x),
    250: 'two and a half times ' + num(x) + ': ' + num(2 * x) + ' + ' + dec(round2(x / 2)),
    300: 'triple ' + num(x),
  };
  return { how: ways[f] ?? f + '% of ' + num(x), value: v };
}

function flipGenerate(d: Difficulty, rng: Rng): ProblemSpec {
  const { x, f } = flipPick(d, rng);
  return {
    prompt: x + '% of ' + num(f),
    spoken: x + ' percent of ' + f,
    answer: friendlyPercent(f, x).value,
    answerKind: Number.isInteger((f * x) / 100) ? 'integer' : 'decimal',
    meta: { x, f },
  };
}

function flipSolve(problem: Problem): Step[] {
  const x = metaNum(problem.meta, 'x');
  const f = metaNum(problem.meta, 'f');
  const { how, value } = friendlyPercent(f, x);
  return [
    {
      text: 'Flip it: ' + x + '% of ' + num(f) + ' is the same as ' + num(f) + '% of ' + x + '.',
      detail: 'Both are ' + x + ' × ' + num(f) + ' ÷ 100 — the order doesn’t matter.',
    },
    { text: num(f) + '% of ' + x + ' is ' + how + ' = ' + dec(value) + '.' },
  ];
}

export const pctFlip = defineSkill({
  id: 'pct-flip',
  title: 'The flip trick',
  blurb: 'x% of y is the same as y% of x. Pick the easy way round.',
  category: 'percent',
  order: 220,
  prereqs: ['pct-20-25-50'],
  targetSeconds: WORD_TARGETS,
  truth: (meta: Meta) => (metaNum(meta, 'x') * metaNum(meta, 'f')) / 100,
  lesson: {
    idea: [
      'A percentage is just multiplying and dividing by 100, so you can swap the two numbers: x% of y always equals y% of x.',
      'That turns awkward ones easy. 8% of 50 looks fiddly, but 50% of 8 is just half of 8.',
    ],
    worked: {
      prompt: '8% of 50',
      steps: [
        { text: 'Flip it: 8% of 50 is the same as 50% of 8.' },
        { text: '50% of 8 is half of 8 = 4.' },
        { text: 'Another: 16% of 25 → 25% of 16 → a quarter of 16 = 4.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 5401 },
      { difficulty: 1, seed: 5402 },
      { difficulty: 2, seed: 5403 },
    ],
  },
  generate: flipGenerate,
  solve: flipSolve,
  constraints: [
    { name: 'the friendly number is never the trivial one', test: (p) => metaNum(p.meta, 'x') !== metaNum(p.meta, 'f') },
    { name: 'difficulty 1 and 2 answers are whole', test: (p) => p.difficulty === 3 || Number.isInteger(p.answer) },
  ],
});
