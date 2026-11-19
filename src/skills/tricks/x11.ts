import { defineSkill } from '../define';
import { digitsOf, metaNum, num } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * Multiplying by 11.
 * meta: { a } — the number being multiplied by 11. meta.flipped: 1 if shown as "a x 11".
 */

/**
 * Computes a x 11 the way the trick does it: write the digits with gaps,
 * fill each gap with the sum of its two neighbours, then carry.
 * Deliberately NOT "a * 11" — tests cross-check this against that.
 */
export function elevenTimes(a: number): number {
  const d = digitsOf(a);
  const padded = [0, ...d, 0];
  const sums: number[] = [];
  for (let i = 0; i < padded.length - 1; i++) {
    sums.push((padded[i] as number) + (padded[i + 1] as number));
  }
  let carry = 0;
  let place = 1;
  let total = 0;
  for (let i = sums.length - 1; i >= 0; i--) {
    const v = (sums[i] as number) + carry;
    total += (v % 10) * place;
    carry = Math.floor(v / 10);
    place *= 10;
  }
  return total + carry * place;
}

/**
 * Describes each carry concretely, right to left, skipping slots where nothing
 * happens. [6, 13, 12, 5] -> ["12 → keep 2, carry 1", "13 + 1 = 14 → keep 4, carry 1", "6 + 1 = 7"]
 */
export function carryNotes(raw: number[]): string[] {
  const notes: string[] = [];
  let carry = 0;
  for (let i = raw.length - 1; i >= 0; i--) {
    const slot = raw[i] as number;
    const v = slot + carry;
    const shown = carry ? slot + ' + ' + carry + ' = ' + v : String(v);
    const leftmost = i === 0;
    if (v > 9 && !leftmost) {
      notes.push(shown + ' → keep ' + (v % 10) + ', carry ' + Math.floor(v / 10));
    } else if (carry) {
      notes.push(shown);
    }
    carry = leftmost ? 0 : Math.floor(v / 10);
  }
  return notes;
}

/** The gapped digit string shown in step 1, e.g. 43 -> "4 _ 3". */
function gapped(a: number): string {
  return digitsOf(a).join('\u00a0_\u00a0'); // non-breaking: never wrap mid-number
}

function describe(a: number, flipped: boolean): { prompt: string; spoken: string } {
  return flipped
    ? { prompt: num(a) + ' × 11', spoken: a + ' times 11' }
    : { prompt: '11 × ' + num(a), spoken: '11 times ' + a };
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  let a: number;
  if (difficulty === 1) {
    // Digits sum to 9 or less: nothing to carry.
    const tens = rng.int(1, 8);
    const ones = rng.int(1, 9 - tens);
    a = tens * 10 + ones;
  } else if (difficulty === 2) {
    // Digits sum to 10 or more: the carry case, which is the whole point.
    const tens = rng.int(2, 9);
    const ones = rng.int(Math.max(1, 10 - tens), 9);
    a = tens * 10 + ones;
  } else {
    a = rng.int(100, 999);
  }
  const flipped = rng.chance(0.5);
  const { prompt, spoken } = describe(a, flipped);
  return {
    prompt,
    spoken,
    answer: elevenTimes(a),
    answerKind: 'integer',
    meta: { a, flipped: flipped ? 1 : 0 },
  };
}

function solve(problem: Problem): Step[] {
  const a = metaNum(problem.meta, 'a');
  const d = digitsOf(a);
  const steps: Step[] = [
    {
      text: 'Write the digits of ' + num(a) + ' with a gap between them: ' + gapped(a) + '.',
      detail: 'The outer digits stay put. The gaps get filled in next.',
    },
  ];

  if (d.length === 2) {
    const [t, o] = d as [number, number];
    const sum = t + o;
    steps.push({ text: 'Add the two digits: ' + t + ' + ' + o + ' = ' + sum + '.' });
    if (sum < 10) {
      steps.push({ text: 'Drop the ' + sum + ' into the gap: ' + num(problem.answer) + '.' });
    } else {
      steps.push({
        text: 'That is two digits, so write the ' + (sum % 10) + ' and carry the 1.',
        detail: 'Only the last digit fits in the gap.',
      });
      steps.push({
        text: 'Add the carry to the front digit: ' + t + ' + 1 = ' + (t + 1) + '.',
      });
      steps.push({ text: 'Read it off: ' + num(problem.answer) + '.' });
    }
    return steps;
  }

  // Three digits or more: each gap takes the sum of the pair around it.
  const pairs = d.slice(0, -1).map((digit, i) => ({ left: digit, right: d[i + 1] as number }));
  steps.push({
    text:
      'Fill each gap with the sum of the pair around it: ' +
      pairs.map((p) => p.left + ' + ' + p.right + ' = ' + (p.left + p.right)).join(', ') +
      '.',
  });
  const raw = [d[0] as number, ...pairs.map((p) => p.left + p.right), d[d.length - 1] as number];
  steps.push({ text: 'That gives ' + raw.join(' | ') + ' before carrying.' });
  if (raw.some((v) => v > 9)) {
    steps.push({
      text: 'Carry right to left: ' + carryNotes(raw).join('; ') + '.',
      detail: 'Any slot over 9 keeps its last digit and passes 1 to the left — same as the two-digit case.',
    });
  }
  steps.push({ text: 'Read it off: ' + num(problem.answer) + '.' });
  return steps;
}

export const x11 = defineSkill({
  id: 'x11',
  title: 'Multiply by 11',
  blurb: 'Split the digits, drop their sum in the middle.',
  category: 'tricks',
  order: 10,
  prereqs: [],
  truth: (meta: Meta) => metaNum(meta, 'a') * 11,
  lesson: {
    idea: [
      'Multiplying by 11 is really just adding a number to itself shifted one place over. That shortcut shows up as a pattern you can see.',
      'Pull the digits of the number apart, leave a gap, and fill the gap with the sum of the two digits. The outside digits never change.',
    ],
    worked: {
      prompt: '11 × 43',
      steps: [
        { text: 'Write the digits of 43 with a gap: 4\u00a0_\u00a03.' },
        { text: 'Add them: 4 + 3 = 7.' },
        { text: 'Drop the 7 into the gap: 473.' },
        {
          text: 'When the sum is 10 or more, carry. For 11 × 68: 6 + 8 = 14, so write 4 and bump the 6 up to 7 — giving 748.',
          detail: 'This is the only case that trips people up, so it gets its own practice level.',
        },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 1101 },
      { difficulty: 1, seed: 1102 },
      { difficulty: 2, seed: 1103 },
    ],
  },
  generate,
  solve,
  constraints: [
    {
      name: 'two-digit operand at difficulty 1 and 2',
      test: (p) => p.difficulty === 3 || (metaNum(p.meta, 'a') >= 10 && metaNum(p.meta, 'a') <= 99),
    },
    {
      name: 'difficulty 1 never carries',
      difficulty: 1,
      test: (p) => {
        const [t, o] = digitsOf(metaNum(p.meta, 'a')) as [number, number];
        return t + o <= 9;
      },
    },
    {
      name: 'difficulty 2 always carries',
      difficulty: 2,
      test: (p) => {
        const [t, o] = digitsOf(metaNum(p.meta, 'a')) as [number, number];
        return t + o >= 10;
      },
    },
    {
      name: 'difficulty 3 uses a three-digit operand',
      difficulty: 3,
      test: (p) => metaNum(p.meta, 'a') >= 100 && metaNum(p.meta, 'a') <= 999,
    },
    {
      name: 'no operand digit is zero at difficulty 1 and 2',
      test: (p) => p.difficulty === 3 || !digitsOf(metaNum(p.meta, 'a')).includes(0),
    },
  ],
});
