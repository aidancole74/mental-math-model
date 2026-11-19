/** Tips, splitting the bill, sale prices, tax and raises — real money, real contexts. */

import { defineSkill } from '../define';
import { dec, metaNum, money, num, round2 } from '../helpers';
import type { Constraint, Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';
import { percentOf } from './blocks';
import { exactLine, m, n, phrase, roundForEstimate, tenPercent } from './phrase';

const MONEY_TARGETS: [number, number, number] = [10, 15, 20];

/** Estimate problems carry meta.est; it must land inside the accepted band. */
const estimateLands: Constraint = {
  name: 'the walkthrough’s own estimate is within 10%',
  test: (p) =>
    p.tolerance === undefined || Math.abs(metaNum(p.meta, 'est') - p.answer) <= p.tolerance + 1e-9,
};

/** Estimate problems are announced as such, and only they have a tolerance. */
const estimateAnnounced: Constraint = {
  name: 'estimate prompts start with "About"',
  test: (p) => (p.tolerance !== undefined) === p.prompt.startsWith('About'),
};

const cents = (rng: Rng): number => rng.pick([0.99, 0.49, 0.95, 0.25, 0.75, 0.37, 0.62, 0.18, 0.84]);

// ======================================================================= tips

const TIP_PLACES = [
  'Dinner comes to {b}. What is {an:p} {p}% tip?',
  'Your lunch bill is {b}. You want to leave {p}%. How much is the tip?',
  'The pizza delivery comes to {b}. What is {an:p} {p}% tip?',
];

function tipGenerate(d: Difficulty, rng: Rng): ProblemSpec {
  if (d === 3) {
    const p = rng.pick([15, 18, 20]);
    const bill = round2(rng.int(18, 240) + cents(rng));
    const answer = round2((p * bill) / 100);
    const est = percentOf(p, roundForEstimate(bill)).value;
    const { prompt, spoken } = phrase('About how much is {an:p} {p}% tip when the bill is {b}?', { p: n(p), b: m(bill) });
    return { prompt, spoken, answer, answerKind: 'money', unit: '$', tolerance: tenPercent(answer), meta: { p, bill, total: 0, ctx: 0, est } };
  }
  const p = d === 1 ? 20 : rng.pick([15, 18, 20]);
  const bill = d === 1 ? rng.int(3, 30) * 5 : rng.int(12, 180);
  const tip = percentOf(p, bill).value;
  const askTotal = d === 2 && rng.chance(0.3);
  const ctx = rng.int(0, TIP_PLACES.length - 1);
  const template = askTotal ? 'Dinner comes to {b}. With {an:p} {p}% tip, what is the total?' : (TIP_PLACES[ctx] as string);
  const { prompt, spoken } = phrase(template, { p: n(p), b: m(bill) });
  return {
    prompt,
    spoken,
    answer: askTotal ? round2(bill + tip) : tip,
    answerKind: 'money',
    unit: '$',
    meta: { p, bill, total: askTotal ? 1 : 0, ctx },
  };
}

function tipSolve(problem: Problem): Step[] {
  const p = metaNum(problem.meta, 'p');
  const bill = metaNum(problem.meta, 'bill');
  if (problem.tolerance !== undefined) {
    const r = roundForEstimate(bill);
    const work = percentOf(p, r);
    return [
      { text: 'Round ' + money(bill) + ' to about ' + money(r) + '.', detail: 'Drop the cents — a tip doesn’t need them.' },
      ...work.steps,
      { text: 'So the tip is about ' + money(work.value) + '. ' + exactLine(problem.answer, problem.tolerance, money) },
    ];
  }
  const work = percentOf(p, bill);
  const steps = [...work.steps];
  if (metaNum(problem.meta, 'total') === 1) {
    steps.push({ text: 'Add it to the bill: ' + num(bill) + ' + ' + dec(work.value) + ' = ' + dec(problem.answer) + '.' });
    steps.push({ text: 'So you pay ' + money(problem.answer) + '.' });
  } else {
    steps.push({ text: 'So the tip is ' + money(problem.answer) + '.' });
  }
  return steps;
}

export const pctTips = defineSkill({
  id: 'pct-tips',
  title: 'Tips: 15%, 18%, 20%',
  blurb: 'Real restaurant bills, done in your head.',
  category: 'percent',
  order: 225,
  prereqs: ['pct-1', 'pct-20-25-50'],
  targetSeconds: MONEY_TARGETS,
  truth: (meta: Meta) => {
    const tip = (metaNum(meta, 'p') * metaNum(meta, 'bill')) / 100;
    return round2(metaNum(meta, 'total') === 1 ? metaNum(meta, 'bill') + tip : tip);
  },
  lesson: {
    idea: [
      'Every common tip comes from the 10% block. 20% is 10% doubled. 15% is 10% plus half of it. 18% is 20% minus a little: take off 2%.',
      'With cents on the bill, round to the nearest dollar first. Nobody needs a tip to the penny.',
    ],
    worked: {
      prompt: '18% tip on $50',
      steps: [
        { text: '10% of $50 is $5, so 20% is $10.' },
        { text: '1% is $0.50, so 2% is $1.' },
        { text: '18% = 20% − 2%: $10 − $1 = $9.' },
        { text: 'On a $83.47 bill: round to $83, and 18% is about $14.94.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 6101 },
      { difficulty: 2, seed: 6102 },
      { difficulty: 2, seed: 6104 },
    ],
  },
  generate: tipGenerate,
  solve: tipSolve,
  hint: (p) =>
    p.tolerance !== undefined
      ? 'Round ' + money(metaNum(p.meta, 'bill')) + ' to the nearest dollar first.'
      : percentOf(metaNum(p.meta, 'p'), metaNum(p.meta, 'bill')).hint,
  constraints: [
    estimateLands,
    estimateAnnounced,
    { name: 'tip is 15, 18 or 20%', test: (p) => [15, 18, 20].includes(metaNum(p.meta, 'p')) },
    { name: 'difficulty 1 is 20% on a multiple of $5', difficulty: 1, test: (p) => metaNum(p.meta, 'p') === 20 && metaNum(p.meta, 'bill') % 5 === 0 },
    { name: 'difficulty 3 is an estimate', difficulty: 3, test: (p) => p.tolerance !== undefined },
  ],
});

// ======================================================================= split the bill

function splitGenerate(d: Difficulty, rng: Rng): ProblemSpec {
  let bill: number;
  let p: number;
  let people: number;
  if (d === 1) {
    p = 0;
    people = rng.int(2, 6);
    bill = rng.int(8, 60) * people;
  } else if (d === 2) {
    p = 20;
    const k = rng.int(4, 40);
    bill = 5 * k;
    const total = 6 * k;
    people = rng.pick([2, 3, 4, 5, 6].filter((c) => total % c === 0));
  } else {
    p = rng.pick([15, 18]);
    bill = p === 15 ? rng.int(2, 12) * 20 : rng.int(1, 5) * 50;
    people = rng.pick([2, 4, 5]);
  }
  const tip = p ? percentOf(p, bill).value : 0;
  const total = round2(bill + tip);
  const answer = round2(total / people);
  const template = p
    ? 'Dinner is {b} and you add {an:p} {p}% tip. Split {k} ways, what does each person pay?'
    : 'The bill is {b}, split {k} ways. What does each person pay?';
  const { prompt, spoken } = phrase(template, { b: m(bill), p: n(p), k: n(people) });
  return { prompt, spoken, answer, answerKind: 'money', unit: '$', meta: { bill, p, people } };
}

function splitSolve(problem: Problem): Step[] {
  const bill = metaNum(problem.meta, 'bill');
  const p = metaNum(problem.meta, 'p');
  const people = metaNum(problem.meta, 'people');
  if (p === 0) {
    return [
      { text: 'Share ' + money(bill) + ' equally between ' + people + ' people.' },
      { text: num(bill) + ' ÷ ' + people + ' = ' + dec(problem.answer) + ', so each person pays ' + money(problem.answer) + '.' },
    ];
  }
  const tip = percentOf(p, bill);
  const total = round2(bill + tip.value);
  return [
    ...tip.steps,
    { text: 'Add the tip: ' + num(bill) + ' + ' + dec(tip.value) + ' = ' + dec(total) + '.' },
    {
      text: 'Split ' + people + ' ways: ' + dec(total) + ' ÷ ' + people + ' = ' + dec(problem.answer) + '.',
      detail: 'Or split first and tip your own share — same answer.',
    },
    { text: 'So each person pays ' + money(problem.answer) + '.' },
  ];
}

export const pctSplit = defineSkill({
  id: 'pct-split',
  title: 'Split the bill',
  blurb: 'Add the tip, then share it out.',
  category: 'percent',
  order: 230,
  prereqs: ['pct-tips'],
  targetSeconds: [10, 18, 25],
  truth: (meta: Meta) =>
    round2((metaNum(meta, 'bill') * (1 + metaNum(meta, 'p') / 100)) / metaNum(meta, 'people')),
  lesson: {
    idea: [
      'Splitting is tip first, then divide — or divide first and tip your own share. Both give the same answer, so pick whichever numbers are friendlier.',
      'When the total doesn’t divide neatly, split it into a round part and a leftover: $96 ÷ 4 is $80 ÷ 4 plus $16 ÷ 4.',
    ],
    worked: {
      prompt: '$80 + 20% tip, split 3 ways',
      steps: [
        { text: '20% of $80: 10% is $8, doubled is $16.' },
        { text: 'Total: $80 + $16 = $96.' },
        { text: 'Split 3 ways: $96 ÷ 3 = $32 each.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 6201 },
      { difficulty: 2, seed: 6202 },
      { difficulty: 2, seed: 6203 },
    ],
  },
  generate: splitGenerate,
  solve: splitSolve,
  hint: (p) =>
    metaNum(p.meta, 'p') === 0
      ? 'Divide the bill by the number of people.'
      : percentOf(metaNum(p.meta, 'p'), metaNum(p.meta, 'bill')).hint,
  constraints: [
    { name: 'each share is whole cents', test: (p) => round2(p.answer) === p.answer },
    { name: 'difficulty 1 and 2 shares are whole dollars', test: (p) => p.difficulty === 3 || Number.isInteger(p.answer) },
    { name: 'the split is exact', test: (p) => Math.abs(p.answer * metaNum(p.meta, 'people') - metaNum(p.meta, 'bill') * (1 + metaNum(p.meta, 'p') / 100)) < 1e-6 },
  ],
});

// ======================================================================= sale price

const SALE_PLACES = [
  '{An:x} {x-} jacket is {d}% off. What is the sale price?',
  'Shoes marked {x} are {d}% off. What do you pay?',
  '{An:x} {x-} lamp is on sale for {d}% off. What is the final price?',
];

function saleGenerate(d: Difficulty, rng: Rng): ProblemSpec {
  if (d === 3) {
    const off = rng.pick([15, 20, 25, 30, 35, 40]);
    const price = round2(rng.int(19, 299) + rng.pick([0.99, 0.95, 0.49]));
    const answer = round2((price * (100 - off)) / 100);
    const est = percentOf(100 - off, roundForEstimate(price)).value;
    const { prompt, spoken } = phrase('About what is the sale price of a coat marked {x}, at {d}% off?', { x: m(price), d: n(off) });
    return { prompt, spoken, answer, answerKind: 'money', unit: '$', tolerance: tenPercent(answer), meta: { off, price, ctx: 0, est } };
  }
  const off = d === 1 ? rng.pick([10, 20, 25, 50]) : rng.pick([15, 30, 35, 40]);
  const price =
    d === 1 ? (off === 25 ? rng.int(5, 75) * 4 : off === 50 ? rng.int(10, 150) * 2 : rng.int(2, 30) * 10) : rng.int(20, 300);
  const ctx = rng.int(0, SALE_PLACES.length - 1);
  const { prompt, spoken } = phrase(SALE_PLACES[ctx] as string, { x: m(price), d: n(off) });
  return { prompt, spoken, answer: percentOf(100 - off, price).value, answerKind: 'money', unit: '$', meta: { off, price, ctx } };
}

function saleSolve(problem: Problem): Step[] {
  const off = metaNum(problem.meta, 'off');
  const price = metaNum(problem.meta, 'price');
  const pay = 100 - off;
  const first: Step = { text: off + '% off means you pay ' + pay + '%.', detail: 'One calculation instead of two: no need to find the discount and subtract.' };
  if (problem.tolerance !== undefined) {
    const r = roundForEstimate(price);
    const work = percentOf(pay, r);
    return [
      first,
      { text: 'Round ' + money(price) + ' to about ' + money(r) + '.' },
      ...work.steps,
      { text: 'So about ' + money(work.value) + '. ' + exactLine(problem.answer, problem.tolerance, money) },
    ];
  }
  return [first, ...percentOf(pay, price).steps, { text: 'So you pay ' + money(problem.answer) + '.' }];
}

export const pctDiscount = defineSkill({
  id: 'pct-discount',
  title: 'Sale prices',
  blurb: '30% off means you pay 70%. One step, not two.',
  category: 'percent',
  order: 235,
  prereqs: ['pct-combine'],
  targetSeconds: MONEY_TARGETS,
  truth: (meta: Meta) => round2((metaNum(meta, 'price') * (100 - metaNum(meta, 'off'))) / 100),
  lesson: {
    idea: [
      'To find a sale price, flip the discount around: 30% off means you pay 70%. Work that out directly instead of finding the discount and subtracting.',
      'Use whichever blocks are easiest: 75% is half plus a quarter, 70% is half plus 20%, 85% is everything minus 15%.',
    ],
    worked: {
      prompt: '$84 jacket, 25% off',
      steps: [
        { text: '25% off means you pay 75%.' },
        { text: '50% of 84 is 42; 25% is half again, 21.' },
        { text: '75% = 42 + 21 = $63.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 6301 },
      { difficulty: 1, seed: 6302 },
      { difficulty: 2, seed: 6303 },
    ],
  },
  generate: saleGenerate,
  solve: saleSolve,
  constraints: [
    estimateLands,
    estimateAnnounced,
    { name: 'difficulty 1 prices come out whole', difficulty: 1, test: (p) => Number.isInteger(p.answer) },
    { name: 'difficulty 3 is an estimate', difficulty: 3, test: (p) => p.tolerance !== undefined },
  ],
});

// ======================================================================= tax, raises, markups

type AddKind = 'tax' | 'raise' | 'markup';
const ADD_PLACES: Record<AddKind, string> = {
  tax: '{An:x} {x-} jacket plus {t}% sales tax. What is the total?',
  raise: 'Your monthly pay of {x} goes up {t}%. What is your new pay?',
  markup: 'A shop buys a lamp for {x} and marks it up {t}%. What is the shop price?',
};
const KINDS: AddKind[] = ['tax', 'raise', 'markup'];

function addGenerate(d: Difficulty, rng: Rng): ProblemSpec {
  if (d === 3) {
    const t = rng.pick([6.25, 7.25, 8.25, 9.25]);
    const price = round2(rng.int(15, 300) + cents(rng));
    const answer = round2((price * t) / 100);
    const est = percentOf(Math.floor(t), roundForEstimate(price)).value;
    const { prompt, spoken } = phrase('About how much is the {t}% sales tax on a purchase of {x}?', {
      t: { show: String(t), say: String(t) },
      x: m(price),
    });
    return { prompt, spoken, answer, answerKind: 'money', unit: '$', tolerance: tenPercent(answer), meta: { t, price, kind: 9, est } };
  }
  let kind: AddKind;
  let t: number;
  let x: number;
  if (d === 1) {
    kind = 'tax';
    t = rng.pick([10, 5]);
    x = rng.int(1, 20) * 20;
  } else {
    kind = rng.pick(KINDS);
    if (kind === 'tax') {
      t = rng.pick([6, 7, 8]);
      x = rng.int(10, 200);
    } else if (kind === 'raise') {
      t = rng.pick([2, 3, 4, 5]);
      x = rng.int(20, 60) * 100;
    } else {
      t = rng.pick([15, 20, 25, 30]);
      x = rng.int(20, 300);
    }
  }
  const { prompt, spoken } = phrase(ADD_PLACES[kind], { x: m(x), t: n(t) });
  const add = percentOf(t, x).value;
  return { prompt, spoken, answer: round2(x + add), answerKind: 'money', unit: '$', meta: { t, price: x, kind: KINDS.indexOf(kind) } };
}

function addSolve(problem: Problem): Step[] {
  const t = metaNum(problem.meta, 't');
  const price = metaNum(problem.meta, 'price');
  if (problem.tolerance !== undefined) {
    const r = roundForEstimate(price);
    const whole = Math.floor(t);
    const work = percentOf(whole, r);
    return [
      { text: 'Round: ' + t + '% is a bit over ' + whole + '%, and ' + money(price) + ' is about ' + money(r) + '.' },
      ...work.steps,
      { text: 'So the tax is about ' + money(work.value) + '. ' + exactLine(problem.answer, problem.tolerance, money) },
    ];
  }
  const work = percentOf(t, price);
  const kind = KINDS[metaNum(problem.meta, 'kind')] ?? 'tax';
  const label = kind === 'raise' ? 'new pay' : kind === 'markup' ? 'shop price' : 'total';
  return [
    ...work.steps,
    { text: 'Add it on: ' + num(price) + ' + ' + dec(work.value) + ' = ' + dec(problem.answer) + '.' },
    { text: 'So the ' + label + ' is ' + money(problem.answer) + '.' },
  ];
}

export const pctTax = defineSkill({
  id: 'pct-tax',
  title: 'Tax, raises and markups',
  blurb: 'Find the percent, then add it on top.',
  category: 'percent',
  order: 240,
  prereqs: ['pct-1'],
  targetSeconds: MONEY_TARGETS,
  truth: (meta: Meta) => {
    const add = (metaNum(meta, 'price') * metaNum(meta, 't')) / 100;
    return round2(metaNum(meta, 'kind') === 9 ? add : metaNum(meta, 'price') + add);
  },
  lesson: {
    idea: [
      'Adding a percentage on top is two moves: find the percent with your blocks, then add it to the original. Sales tax, a pay rise and a shop’s markup all work this way.',
      'Odd tax rates like 8.25% are easiest to estimate: call it 8%, and know the real tax is a touch more.',
    ],
    worked: {
      prompt: '$60 plus 8% tax',
      steps: [
        { text: '10% of 60 is 6. 1% is 0.6, so 2% is 1.2.' },
        { text: '8% = 10% − 2%: 6 − 1.2 = 4.8.' },
        { text: 'Add it on: $60 + $4.80 = $64.80.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 6401 },
      { difficulty: 1, seed: 6402 },
      { difficulty: 2, seed: 6403 },
    ],
  },
  generate: addGenerate,
  solve: addSolve,
  hint: (p) =>
    p.tolerance !== undefined
      ? 'Round the tax rate down to a whole percent and the price to the nearest dollar.'
      : percentOf(metaNum(p.meta, 't'), metaNum(p.meta, 'price')).hint,
  constraints: [
    estimateLands,
    estimateAnnounced,
    { name: 'difficulty 1 totals are whole dollars', difficulty: 1, test: (p) => Number.isInteger(p.answer) },
    { name: 'difficulty 3 is an estimate', difficulty: 3, test: (p) => p.tolerance !== undefined },
  ],
});
