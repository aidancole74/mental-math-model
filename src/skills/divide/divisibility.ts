import { defineSkill } from '../define';
import { digitsOf, metaNum, metaStr, num, sumDigits } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * Divisibility rules, asked as numbers so answers stay on the keypad:
 *   kind 0  "Remainder when 7,341 is divided by 9?"         meta { kind, n, d }
 *   kind 1  "Which digit makes 4_72 divisible by 9?"          meta { kind, pattern, d }
 * Missing-digit questions with more than one fitting digit ask for the smallest.
 */

// ------------------------------------------------------------- remainders, the rule way

/** −7 with a real minus sign. */
function signed(v: number): string {
  return v < 0 ? '−' + num(-v) : num(v);
}

/** Largest multiple of d at or below v. */
function floorMultiple(v: number, d: number): number {
  return Math.floor(v / d) * d;
}

/** Alternating sum from the right: ones − tens + hundreds − ... */
export function alternatingSum(n: number): number {
  return digitsOf(n)
    .reverse()
    .reduce((acc, digit, i) => acc + (i % 2 === 0 ? digit : -digit), 0);
}

/** n mod d using only the divisibility rule for d. d in {3, 4, 5, 8, 9, 11}. */
export function ruleRemainder(n: number, d: number): number {
  switch (d) {
    case 3: {
      const s = sumDigits(n);
      return s - floorMultiple(s, 3);
    }
    case 9: {
      let s = sumDigits(n);
      while (s > 9) s = sumDigits(s);
      return s === 9 ? 0 : s;
    }
    case 4: {
      const last2 = n % 100;
      return last2 - floorMultiple(last2, 4);
    }
    case 5:
      return (n % 10) % 5;
    case 8: {
      // 200 is a multiple of 8, so only whether the hundreds digit is odd matters (100 leaves 4).
      const last3 = n % 1000;
      const v = (Math.floor(last3 / 100) % 2) * 4 + (last3 % 100);
      return v - floorMultiple(v, 8);
    }
    case 11: {
      let s = alternatingSum(n);
      while (s < 0) s += 11;
      while (s >= 11) s -= 11;
      return s;
    }
  }
  throw new Error('no rule for ' + d);
}

function remainderSteps(n: number, d: number, answer: number): Step[] {
  const close = (v: number): Step => {
    const m = floorMultiple(v, d);
    return {
      text:
        v === m
          ? num(v) + ' is a multiple of ' + d + ', so the remainder is ' + answer + '.'
          : 'The nearest multiple of ' + d + ' at or below ' + num(v) + ' is ' + num(m) + ', so the remainder is ' + answer + '.',
    };
  };
  const ds = digitsOf(n);
  switch (d) {
    case 3:
    case 9: {
      const steps: Step[] = [
        {
          text: 'Add the digits: ' + ds.join(' + ') + ' = ' + sumDigits(n) + '.',
          detail: 'A number leaves the same remainder as its digit sum when divided by ' + d + '.',
        },
      ];
      if (d === 3) return [...steps, close(sumDigits(n))];
      let s = sumDigits(n);
      while (s > 9) {
        const next = sumDigits(s);
        steps.push({ text: 'Still two digits, so add again: ' + digitsOf(s).join(' + ') + ' = ' + next + '.' });
        s = next;
      }
      steps.push({ text: s === 9 ? 'A digit sum of 9 divides evenly, so the remainder is 0.' : 'The remainder is ' + answer + '.' });
      return steps;
    }
    case 4: {
      const last2 = n % 100;
      return [
        { text: 'Only the last two digits matter: ' + last2 + '.', detail: '100 is a multiple of 4, so the hundreds and up divide evenly.' },
        close(last2),
      ];
    }
    case 5:
      return [
        { text: 'Only the last digit matters: ' + (n % 10) + '.', detail: '10 is a multiple of 5.' },
        close(n % 10),
      ];
    case 8: {
      const last3 = n % 1000;
      const odd = Math.floor(last3 / 100) % 2 === 1;
      const v = (odd ? 4 : 0) + (last3 % 100);
      return [
        { text: 'Only the last three digits matter: ' + num(last3) + '.', detail: '1,000 is a multiple of 8.' },
        {
          text: odd
            ? 'Every 200 divides by 8, and the odd 100 leaves 4. So use 4 + ' + (last3 % 100) + ' = ' + v + '.'
            : 'Every 200 divides by 8, so drop the hundreds: ' + v + '.',
        },
        close(v),
      ];
    }
    case 11: {
      const rev = ds.slice().reverse();
      const expr = rev.map((digit, i) => (i === 0 ? String(digit) : (i % 2 ? ' − ' : ' + ') + digit)).join('');
      const s = alternatingSum(n);
      const steps: Step[] = [
        {
          text: 'From the right, add and subtract the digits in turn: ' + expr + ' = ' + signed(s) + '.',
          detail: 'A number leaves the same remainder as this alternating sum when divided by 11.',
        },
      ];
      if (s < 0) {
        let v = s;
        while (v < 0) v += 11;
        steps.push({ text: 'Below zero, so add ' + (v - s === 11 ? '11' : 'multiples of 11') + ': ' + signed(s) + ' + ' + (v - s) + ' = ' + v + '.' });
      } else if (s >= 11) {
        const v = s - floorMultiple(s, 11);
        steps.push({ text: 'Take away ' + (s - v === 11 ? '11' : 'multiples of 11') + ': ' + s + ' − ' + (s - v) + ' = ' + v + '.' });
      }
      steps.push({ text: 'The remainder is ' + answer + '.' });
      return steps;
    }
  }
  throw new Error('no rule for ' + d);
}

// ------------------------------------------------------------- missing digits

/** The digits of a pattern like "4_72", with null for the blank. */
function slots(pattern: string): (number | null)[] {
  return pattern.split('').map((c) => (c === '_' ? null : Number(c)));
}

/** Smallest digit for the blank, the rule way. d in {3, 4, 6, 9, 11}; null if none fits. */
export function missingDigit(pattern: string, d: number): number | null {
  const s = slots(pattern);
  const known = s.reduce<number>((a, v) => a + (v ?? 0), 0);
  if (d === 3 || d === 9 || d === 6) {
    if (d === 6 && (s[s.length - 1] ?? 1) % 2 !== 0) return null; // must already be even
    const m = d === 9 ? 9 : 3;
    return (m - (known % m)) % m;
  }
  if (d === 4) {
    // Blank in the tens place: 10x + ones divides by 4 when 2x + ones does.
    const ones = s[s.length - 1] ?? 0;
    for (let x = 0; x <= 9; x++) if ((2 * x + ones) % 4 === 0) return x;
    return null;
  }
  // 11: the blank's sign in the alternating sum decides which way to go.
  const rev = s.slice().reverse();
  const blankAt = rev.indexOf(null);
  const rest = rev.reduce<number>((a, v, i) => (v === null ? a : a + (i % 2 === 0 ? v : -v)), 0);
  const x = blankAt % 2 === 0 ? (((-rest) % 11) + 11) % 11 : ((rest % 11) + 11) % 11;
  return x <= 9 ? x : null;
}

/** All digits that fit, by brute force — for the "is it unique?" checks. */
export function fittingDigits(pattern: string, d: number): number[] {
  const out: number[] = [];
  for (let x = 0; x <= 9; x++) if (Number(pattern.replace('_', String(x))) % d === 0) out.push(x);
  return out;
}

function missingSteps(pattern: string, d: number, answer: number): Step[] {
  const s = slots(pattern);
  const knownDigits = s.filter((v): v is number => v !== null);
  const known = knownDigits.reduce((a, b) => a + b, 0);
  if (d === 3 || d === 9 || d === 6) {
    const m = d === 9 ? 9 : 3;
    const target = Math.ceil(known / m) * m;
    const steps: Step[] = [];
    if (d === 6) steps.push({ text: 'Divisible by 6 means even and divisible by 3. It already ends in an even digit, so make it divisible by 3.' });
    steps.push({ text: 'Add the digits you know: ' + knownDigits.join(' + ') + ' = ' + known + '.', detail: 'The full digit sum must be a multiple of ' + m + '.' });
    steps.push({
      text:
        target === known
          ? known + ' is already a multiple of ' + m + ', so the smallest digit that works is 0.'
          : 'The next multiple of ' + m + ' is ' + target + ', so the ' + (m === 3 ? 'smallest ' : '') + 'missing digit is ' + target + ' − ' + known + ' = ' + answer + '.',
    });
    return steps;
  }
  if (d === 4) {
    const ones = s[s.length - 1] ?? 0;
    return [
      { text: 'Only the last two digits matter: _' + ones + '.', detail: '100 is a multiple of 4.' },
      {
        text:
          answer === 0
            ? 'A 0 there leaves just ' + ones + ' = 4 × ' + ones / 4 + ', so the smallest digit is 0.'
            : 'A 0 there leaves ' + ones + ', which does not divide by 4. ' + answer + ones + ' = 4 × ' + (answer * 10 + ones) / 4 + ', so the smallest digit is ' + answer + '.',
      },
    ];
  }
  const rev = s.slice().reverse();
  const expr = rev.map((v, i) => (i === 0 ? '' : i % 2 ? ' − ' : ' + ') + (v === null ? '?' : v)).join('');
  const rest = rev.reduce<number>((a, v, i) => (v === null ? a : a + (i % 2 === 0 ? v : -v)), 0);
  const plus = rev.indexOf(null) % 2 === 0;
  return [
    { text: 'From the right, add and subtract in turn, with ? for the blank: ' + expr + '.', detail: 'The total must be a multiple of 11 (and 0 counts).' },
    { text: 'The known digits come to ' + signed(rest) + ', so the total is ' + signed(rest) + (plus ? ' + ?' : ' − ?') + '.' },
    { text: 'Only one digit lands it on a multiple of 11: the missing digit is ' + answer + '.' },
  ];
}

// ------------------------------------------------------------- generator

function randomNumber(rng: Rng, digits: number): number {
  return rng.int(10 ** (digits - 1), 10 ** digits - 1);
}

/** A pattern of `digits` digits with the blank somewhere after the first. */
function randomPattern(rng: Rng, digits: number, blankAt: number): string {
  const ds = [rng.int(1, 9), ...Array.from({ length: digits - 1 }, () => rng.int(0, 9))];
  return ds.map((v, i) => (i === blankAt ? '_' : String(v))).join('');
}

function remainderProblem(rng: Rng, d: number, digits: number): ProblemSpec {
  const n = randomNumber(rng, digits);
  return {
    prompt: 'Remainder when ' + num(n) + ' is divided by ' + d + '?',
    spoken: 'What is the remainder when ' + n + ' is divided by ' + d + '?',
    answer: ruleRemainder(n, d),
    answerKind: 'integer',
    meta: { kind: 0, n, d },
  };
}

function missingProblem(rng: Rng, d: number, digits: number): ProblemSpec {
  for (;;) {
    const blankAt = d === 4 ? digits - 2 : rng.int(1, digits - (d === 6 ? 2 : 1));
    const pattern = randomPattern(rng, digits, blankAt);
    const answer = missingDigit(pattern, d);
    if (answer === null) continue;
    if (d === 4 && pattern.endsWith('0')) continue; // _0 with a 0 is no question at all
    // Questions for 9 and 11 must have exactly one right digit (4_5 + 0 vs 9 for 9).
    if ((d === 9 || d === 11) && fittingDigits(pattern, d).length !== 1) continue;
    const smallest = d === 3 || d === 4 || d === 6;
    const spokenDigits = pattern.split('').map((c) => (c === '_' ? 'blank' : c)).join(', ');
    return {
      prompt: (smallest ? 'Smallest digit that makes ' : 'Which digit makes ') + pattern + ' divisible by ' + d + '?',
      spoken: (smallest ? 'What is the smallest digit that makes ' : 'Which digit makes ') + spokenDigits + ' divisible by ' + d + '?',
      answer,
      answerKind: 'integer',
      meta: { kind: 1, pattern, d },
    };
  }
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  if (difficulty === 1) return remainderProblem(rng, rng.pick([3, 9, 4, 5]), 3);
  if (difficulty === 2) {
    return rng.chance(0.5)
      ? remainderProblem(rng, rng.pick([3, 9, 4, 8]), 4)
      : missingProblem(rng, rng.pick([3, 9]), 4);
  }
  return rng.chance(0.5)
    ? remainderProblem(rng, rng.pick([11, 8]), rng.int(4, 5))
    : missingProblem(rng, rng.pick([11, 6, 4]), rng.int(4, 5));
}

const RULE_HINT: Record<number, string> = {
  3: 'Add up the digits — they leave the same remainder as the whole number.',
  9: 'Add up the digits — they leave the same remainder as the whole number.',
  4: 'Only the last two digits matter for 4.',
  5: 'Only the last digit matters for 5.',
  8: 'Only the last three digits matter for 8.',
  11: 'From the right, add and subtract the digits in turn.',
};

const MISSING_HINT: Record<number, string> = {
  3: 'The digits must add up to a multiple of 3.',
  9: 'The digits must add up to a multiple of 9.',
  6: 'It must be even and its digits must add up to a multiple of 3.',
  4: 'Only the last two digits matter for 4.',
  11: 'From the right, add and subtract the digits in turn. The total must be a multiple of 11.',
};

export const divisibility = defineSkill({
  id: 'divisibility',
  title: 'Divisibility rules',
  blurb: 'Tell what divides a number without dividing it.',
  category: 'divide',
  order: 405,
  prereqs: [],
  targetSeconds: [8, 12, 18],
  truth: (meta: Meta) =>
    metaNum(meta, 'kind') === 0
      ? metaNum(meta, 'n') % metaNum(meta, 'd')
      : (fittingDigits(metaStr(meta, 'pattern'), metaNum(meta, 'd'))[0] ?? NaN),
  hint: (problem) =>
    (metaNum(problem.meta, 'kind') === 0 ? RULE_HINT : MISSING_HINT)[metaNum(problem.meta, 'd')] ?? '',
  lesson: {
    idea: [
      'Each small divisor has a shortcut. 2, 5 and 10 look at the last digit; 4 at the last two; 8 at the last three. For 3 and 9, add up the digits: the number leaves the same remainder as its digit sum. 6 means both 2 and 3.',
      'For 11, go from the right adding and subtracting the digits in turn. If that lands on a multiple of 11 (0 counts), so does the number. Here you will find remainders and missing digits.',
    ],
    worked: {
      prompt: 'Remainder when 7,341 is divided by 9?',
      steps: [
        { text: 'Add the digits: 7 + 3 + 4 + 1 = 15.' },
        { text: 'Add again: 1 + 5 = 6.' },
        { text: 'The remainder is 6.' },
        { text: 'For 11 instead: 1 − 4 + 3 − 7 = −7, and −7 + 11 = 4. Remainder 4.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 4051 },
      { difficulty: 1, seed: 4052 },
      { difficulty: 2, seed: 4053 },
    ],
  },
  generate,
  solve: (problem: Problem): Step[] =>
    metaNum(problem.meta, 'kind') === 0
      ? remainderSteps(metaNum(problem.meta, 'n'), metaNum(problem.meta, 'd'), problem.answer)
      : missingSteps(metaStr(problem.meta, 'pattern'), metaNum(problem.meta, 'd'), problem.answer),
  constraints: [
    { name: 'remainders are smaller than the divisor', test: (p) => p.meta.kind !== 0 || p.answer < metaNum(p.meta, 'd') },
    { name: 'missing digits are single digits', test: (p) => p.meta.kind !== 1 || (p.answer >= 0 && p.answer <= 9) },
    {
      name: 'missing-digit answers for 9 and 11 are the only digit that fits',
      test: (p) => p.meta.kind !== 1 || ![9, 11].includes(metaNum(p.meta, 'd')) || fittingDigits(metaStr(p.meta, 'pattern'), metaNum(p.meta, 'd')).length === 1,
    },
    { name: 'the blank is never the first digit', test: (p) => p.meta.kind !== 1 || !metaStr(p.meta, 'pattern').startsWith('_') },
    { name: 'difficulty 1 asks remainders of three-digit numbers', difficulty: 1, test: (p) => p.meta.kind === 0 && metaNum(p.meta, 'n') < 1000 },
  ],
});
