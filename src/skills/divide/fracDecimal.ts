import { defineSkill } from '../define';
import { metaNum } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * Fractions to decimals, by recognising the family:
 *   hundredths (4, 5, 20, 25, 50)  scale the bottom to 100
 *   eighths                        each eighth is 0.125
 *   thirds, sixths, ninths, sevenths, elevenths   repeating patterns, rounded to 3 places
 * meta: { num, den }. Answers are typed to 3 decimal places.
 */

const SEVENS = '142857';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Decimal digits of num/den for the repeating families (num < den), the pattern way. */
export function repeatingDigits(num: number, den: number, length = 12): string {
  let block: string;
  if (den === 9 || den === 3) {
    block = String((num * 9) / den); // thirds become ninths: 2/3 = 6/9
  } else if (den === 11) {
    block = String(9 * num).padStart(2, '0');
  } else if (den === 7) {
    const start = SEVENS.indexOf(String(Math.floor((10 * num) / 7)));
    block = SEVENS.slice(start) + SEVENS.slice(0, start);
  } else if (den === 6) {
    // 1/6 = 0.1666…, 5/6 = 0.8333…: one digit, then a repeating one.
    const head = num === 1 ? '1' : '8';
    const tail = num === 1 ? '6' : '3';
    return (head + tail.repeat(length)).slice(0, length);
  } else {
    throw new Error('not a repeating family: ' + den);
  }
  return block.repeat(Math.ceil(length / block.length)).slice(0, length);
}

/** Rounds a digit string after "0." to 3 places: "714285" -> 714 thousandths. */
function roundThousandths(digits: string): number {
  const k = Number(digits.slice(0, 3));
  return Number(digits[3] ?? '0') >= 5 ? k + 1 : k;
}

/** num/den as a decimal, computed the way the walkthrough does it. */
export function fractionToDecimal(num: number, den: number): number {
  if (100 % den === 0) return (num * (100 / den)) / 100;
  if (den === 8) return (Math.floor(num / 8) * 1000 + (num % 8) * 125) / 1000;
  return roundThousandths(repeatingDigits(num, den)) / 1000;
}

const HUNDREDTHS = [4, 5, 20, 25, 50];
const REPEATING = [3, 6, 7, 9, 11];

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  for (;;) {
    let den: number;
    let num: number;
    if (difficulty === 1) {
      den = rng.pick(HUNDREDTHS);
      num = rng.int(1, den - 1);
    } else if (difficulty === 2) {
      den = 8;
      num = rng.chance(0.4) ? rng.int(1, 7) : rng.int(9, 23);
    } else {
      den = rng.pick(REPEATING);
      num = rng.int(1, den - 1);
    }
    if (gcd(num, den) !== 1) continue;
    const places = difficulty === 3;
    return {
      prompt: num + '/' + den + ' as a decimal' + (places ? ', to 3 places?' : '?'),
      spoken: 'What is ' + num + ' over ' + den + ' as a decimal' + (places ? ', rounded to 3 decimal places?' : '?'),
      answer: fractionToDecimal(num, den),
      answerKind: 'decimal',
      decimals: 3,
      meta: { num, den },
    };
  }
}

function fmt(v: number): string {
  return String(v);
}

function solve(problem: Problem): Step[] {
  const num = metaNum(problem.meta, 'num');
  const den = metaNum(problem.meta, 'den');
  const ans = fmt(problem.answer);

  if (100 % den === 0) {
    const f = 100 / den;
    const top = num * f;
    return [
      { text: 'Multiply top and bottom by ' + f + ' to make hundredths: ' + num + '/' + den + ' = ' + top + '/100.', detail: den + ' × ' + f + ' = 100.' },
      { text: top + ' hundredths is ' + ans + '.' },
    ];
  }
  if (den === 8) {
    const whole = Math.floor(num / 8);
    const rest = num % 8;
    const part = (rest * 125) / 1000;
    const steps: Step[] = [];
    if (whole) steps.push({ text: 'Pull out the whole number: ' + num + '/8 = ' + whole + ' and ' + rest + '/8.', detail: '8 × ' + whole + ' = ' + 8 * whole + '.' });
    steps.push({ text: 'An eighth is half of a quarter: 0.25 ÷ 2 = 0.125.' });
    steps.push({ text: rest + '/8 = ' + rest + ' × 0.125 = ' + fmt(part) + (whole ? ', so ' + num + '/8 = ' + ans + '.' : '.') });
    return steps;
  }

  const digits = repeatingDigits(num, den);
  const shown = '0.' + digits.slice(0, 6) + '…';
  const round: Step = {
    text: 'To 3 places: 0.' + digits.slice(0, 4) + '… rounds ' + (Number(digits[3]) >= 5 ? 'up' : 'down') + ' to ' + ans + '.',
  };
  if (den === 9 || den === 3) {
    const ninths = (num * 9) / den;
    const first: Step =
      den === 3
        ? { text: 'Turn thirds into ninths: ' + num + '/3 = ' + ninths + '/9.', detail: 'Ninths are the easiest repeating decimals.' }
        : { text: 'Ninths repeat their top number forever.', detail: '1/9 = 0.111…, 2/9 = 0.222…, and so on.' };
    return [first, { text: ninths + '/9 = ' + shown }, round];
  }
  if (den === 11) {
    return [
      { text: 'Elevenths repeat a two-digit block: 9 × the top number.', detail: '1/11 = 0.0909…, 2/11 = 0.1818…' },
      { text: '9 × ' + num + ' = ' + String(9 * num).padStart(2, '0') + ', so ' + num + '/11 = ' + shown },
      round,
    ];
  }
  if (den === 6) {
    return [
      { text: 'A sixth is half of a third: 0.333… ÷ 2 = 0.1666…' },
      num === 1 ? { text: '1/6 = ' + shown } : { text: '5/6 is 1 − 1/6 = ' + shown },
      round,
    ];
  }
  const firstDigit = Math.floor((10 * num) / 7);
  return [
    { text: 'Sevenths cycle through the same six digits: 1 4 2 8 5 7.', detail: '1/7 = 0.142857…, and every other seventh starts somewhere in that loop.' },
    {
      text: num + ' ÷ 7 starts 0.' + firstDigit + ' (7 × ' + firstDigit + ' = ' + 7 * firstDigit + ' fits into ' + 10 * num + '), so start the loop at ' + firstDigit + ': ' + shown,
    },
    round,
  ];
}

const HINTS: Record<number, string> = {
  8: 'An eighth is half of a quarter.',
  3: 'Turn thirds into ninths first.',
  9: 'Ninths repeat their top number forever.',
  6: 'A sixth is half of a third.',
  7: 'Sevenths cycle through the same six digits: 1, 4, 2, 8, 5, 7.',
  11: 'Elevenths repeat a two-digit block: 9 times the top number.',
};

export const fracDecimal = defineSkill({
  id: 'frac-decimal',
  title: 'Fractions to decimals',
  blurb: 'Know the families: hundredths, eighths, and the repeaters.',
  category: 'divide',
  order: 410,
  prereqs: ['divide-1d'],
  targetSeconds: [6, 10, 15],
  truth: (meta: Meta) => Math.round((metaNum(meta, 'num') / metaNum(meta, 'den')) * 1000) / 1000,
  hint: (problem) => {
    const den = metaNum(problem.meta, 'den');
    if (100 % den === 0) return 'Scale the bottom up to 100: multiply top and bottom by ' + 100 / den + '.';
    if (den === 8 && metaNum(problem.meta, 'num') > 8) return 'Pull out the whole number first, then do the eighths.';
    return HINTS[den] ?? '';
  },
  lesson: {
    idea: [
      'Most fractions you meet belong to a family with a pattern. If the bottom goes into 100, scale it up: 3/4 = 75/100 = 0.75. Every eighth is 0.125, so 3/8 = 0.375.',
      'Ninths repeat their top number (4/9 = 0.444…), elevenths repeat 9 × the top (3/11 = 0.2727…), and sevenths loop through 142857. Type answers to 3 decimal places, rounding the last one.',
    ],
    worked: {
      prompt: '5/7 as a decimal, to 3 places?',
      steps: [
        { text: 'Sevenths loop through 1 4 2 8 5 7.' },
        { text: '5 ÷ 7 starts 0.7, so start the loop at 7: 0.714285…' },
        { text: 'To 3 places: 0.714.' },
        { text: 'An eighth instead: 3/8 = 3 × 0.125 = 0.375.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 4101 },
      { difficulty: 2, seed: 4102 },
      { difficulty: 3, seed: 4103 },
    ],
  },
  generate,
  solve,
  constraints: [
    { name: 'the fraction is in lowest terms', test: (p) => gcd(metaNum(p.meta, 'num'), metaNum(p.meta, 'den')) === 1 },
    { name: 'never a whole number', test: (p) => !Number.isInteger(p.answer) },
    { name: 'difficulty 1 bottoms divide 100', difficulty: 1, test: (p) => 100 % metaNum(p.meta, 'den') === 0 },
    { name: 'difficulty 2 is eighths', difficulty: 2, test: (p) => metaNum(p.meta, 'den') === 8 },
    { name: 'difficulty 3 needs rounding to 3 places', difficulty: 3, test: (p) => REPEATING.includes(metaNum(p.meta, 'den')) },
  ],
});
