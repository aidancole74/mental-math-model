import { defineSkill } from '../define';
import { metaNum, money, num, round2 } from '../helpers';
import { m, phrase } from '../percent/phrase';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * Complements: 100 − 37 and 1000 − 638 without borrowing, and making change.
 * Every digit pairs with a partner to make 9, except the last, which makes 10.
 *
 * meta: { kind, base, n } for 100/1000 − n  (kind 0)
 *       { kind, pay, price } for change      (kind 1)
 */

/** The partner digits: 37 of 100 -> [6, 3]; 38 of 1000 -> [9, 6, 2]. n must not end in 0. */
export function partnerDigits(n: number, base: 100 | 1000): number[] {
  const width = base === 100 ? 2 : 3;
  const digits = String(n).padStart(width, '0').split('').map(Number);
  return digits.map((d, i) => (i === digits.length - 1 ? 10 - d : 9 - d));
}

/** base − n, read off the partner digits (deliberately not base - n). */
export function complement(n: number, base: 100 | 1000): number {
  return Number(partnerDigits(n, base).join(''));
}

/** Change from `pay` for `price`, counting up: cents to the next dollar, then dollars. */
export function countUpChange(pay: number, price: number): { cents: number; nextDollar: number; dollars: number; change: number } {
  const priceCents = Math.round(price * 100);
  const cents = complement(priceCents % 100, 100);
  const nextDollar = Math.floor(priceCents / 100) + 1;
  const dollars = pay - nextDollar;
  return { cents, nextDollar, dollars, change: round2(dollars + cents / 100) };
}

/** An n whose last digit is not 0, in [min, max]. */
function noRoundEnd(rng: Rng, min: number, max: number): number {
  for (;;) {
    const v = rng.int(min, max);
    if (v % 10 !== 0) return v;
  }
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  if (difficulty !== 3) {
    const base = difficulty === 1 ? 100 : 1000;
    // Answers stay the same size as the problem: 100 − 91 = 9 is no practice.
    const n = difficulty === 1 ? noRoundEnd(rng, 11, 89) : noRoundEnd(rng, 101, 899);
    return {
      prompt: num(base) + ' − ' + num(n),
      spoken: base + ' minus ' + n,
      answer: complement(n, base),
      answerKind: 'integer',
      meta: { kind: 0, base, n },
    };
  }
  const pay = rng.pick([10, 20, 50, 100]);
  const dollars = rng.int(1, pay - 2);
  const cents = noRoundEnd(rng, 1, 99);
  const price = round2(dollars + cents / 100);
  const { prompt, spoken } = phrase('Something costs {price}. You pay with {an:pay} {pay-} bill. How much change?', {
    price: m(price),
    pay: m(pay),
  });
  return {
    prompt,
    spoken,
    answer: countUpChange(pay, price).change,
    answerKind: 'money',
    unit: '$',
    meta: { kind: 1, pay, price },
  };
}

function solve(problem: Problem): Step[] {
  if (metaNum(problem.meta, 'kind') === 0) {
    const base = metaNum(problem.meta, 'base') as 100 | 1000;
    const n = metaNum(problem.meta, 'n');
    const digits = String(n).padStart(base === 100 ? 2 : 3, '0').split('').map(Number);
    const partners = partnerDigits(n, base);
    const pairs = digits.map((d, i) => d + ' + ' + partners[i] + ' = ' + (i === digits.length - 1 ? 10 : 9));
    return [
      {
        text: 'Give each digit of ' + num(n) + ' a partner: the last digit makes 10, every other digit makes 9.',
        detail: base === 100 ? '100 is 99 + 1, so nothing needs borrowing.' : '1,000 is 999 + 1, so nothing needs borrowing.',
      },
      { text: 'Partners: ' + pairs.join(', ') + '.' },
      { text: 'Read the partners off: ' + num(base) + ' − ' + num(n) + ' = ' + num(problem.answer) + '.' },
    ];
  }
  const pay = metaNum(problem.meta, 'pay');
  const price = metaNum(problem.meta, 'price');
  const { cents, nextDollar, dollars } = countUpChange(pay, price);
  const priceCents = String(Math.round(price * 100) % 100).padStart(2, '0');
  return [
    {
      text: 'Count up from ' + money(price) + ' to ' + money(nextDollar) + ': that takes ' + cents + '¢.',
      detail: 'Cents partner up to 100: ' + priceCents + ' + ' + String(cents).padStart(2, '0') + ' = 100.',
    },
    { text: 'From ' + money(nextDollar) + ' up to ' + money(pay) + ' is ' + money(dollars) + '.' },
    { text: 'Change: ' + money(dollars) + ' and ' + cents + '¢ = ' + money(problem.answer) + '.' },
  ];
}

export const complements = defineSkill({
  id: 'complements',
  title: 'Subtract from 100 and 1,000',
  blurb: 'Digit partners make 9, the last makes 10. Count up for change.',
  category: 'addsub',
  order: 120,
  prereqs: ['ltr-sub'],
  targetSeconds: [6, 8, 15],
  truth: (meta: Meta) =>
    metaNum(meta, 'kind') === 0
      ? metaNum(meta, 'base') - metaNum(meta, 'n')
      : round2(metaNum(meta, 'pay') - metaNum(meta, 'price')),
  hint: (problem) => {
    if (metaNum(problem.meta, 'kind') === 0) {
      return 'Find a partner for each digit of ' + num(metaNum(problem.meta, 'n')) + ': the last one makes 10, the rest make 9.';
    }
    const { nextDollar } = countUpChange(metaNum(problem.meta, 'pay'), metaNum(problem.meta, 'price'));
    return 'Count up: first to ' + money(nextDollar) + ', then on to ' + money(metaNum(problem.meta, 'pay')) + '.';
  },
  lesson: {
    idea: [
      'Taking a number away from 100 or 1,000 is where borrowing gets messy. Skip it: give each digit a partner. The last digit pairs up to make 10, every other digit to make 9. The partners spell the answer.',
      'Making change is the same move. Count up from the price to the next whole dollar, then on to the bill you handed over.',
    ],
    worked: {
      prompt: '1,000 − 638',
      steps: [
        { text: '6 needs 3 to make 9.' },
        { text: '3 needs 6 to make 9.' },
        { text: 'The last digit, 8, needs 2 to make 10.' },
        { text: 'Read the partners: 362.' },
        { text: 'Change from $20 for $13.47: 47¢ needs 53¢ to reach $14, then $6 more to $20. Change: $6.53.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 1201 },
      { difficulty: 2, seed: 1202 },
      { difficulty: 3, seed: 1203 },
    ],
  },
  generate,
  solve,
  constraints: [
    {
      name: 'the number taken away never ends in 0',
      test: (p) => (metaNum(p.meta, 'kind') === 0 ? metaNum(p.meta, 'n') % 10 !== 0 : Math.round(metaNum(p.meta, 'price') * 100) % 10 !== 0),
    },
    { name: 'difficulty 1 is 100 minus a two-digit number, answer two digits', difficulty: 1, test: (p) => p.meta.base === 100 && p.answer >= 11 && p.answer <= 89 },
    { name: 'difficulty 2 is 1,000 minus a three-digit number, answer three digits', difficulty: 2, test: (p) => p.meta.base === 1000 && p.answer >= 101 && p.answer <= 899 },
    { name: 'difficulty 3 makes change of at least $1', difficulty: 3, test: (p) => metaNum(p.meta, 'kind') === 1 && p.answer >= 1 },
  ],
});
