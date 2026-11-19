/**
 * The percentage building blocks, shared by the whole percent track.
 *
 * Any "p% of x" the app asks about is built from a few blocks a person can
 * find instantly — 10% (shift the decimal), 1% (shift twice), 50% (halve),
 * 25% (halve again), 20% (double 10%), 5% (half of 10%) — then combined.
 * The same plan produces the answer and the walkthrough.
 */

import { dec, num, round2 } from '../helpers';
import type { Step } from '../types';

export type Block = '100' | '50' | '25' | '20' | '10' | '5' | '1';

/** [coefficient, block] terms. 35% = 3 × 10% + 1 × 5%. */
export type Plan = [number, Block][];

export const PLANS: Record<number, Plan> = {
  1: [[1, '1']],
  2: [[2, '1']],
  3: [[3, '1']],
  4: [[4, '1']],
  5: [[1, '5']],
  6: [[1, '5'], [1, '1']],
  7: [[1, '5'], [2, '1']],
  8: [[1, '10'], [-2, '1']],
  9: [[1, '10'], [-1, '1']],
  10: [[1, '10']],
  11: [[1, '10'], [1, '1']],
  12: [[1, '10'], [2, '1']],
  15: [[1, '10'], [1, '5']],
  18: [[1, '20'], [-2, '1']],
  20: [[1, '20']],
  25: [[1, '25']],
  30: [[3, '10']],
  35: [[3, '10'], [1, '5']],
  40: [[4, '10']],
  45: [[1, '50'], [-1, '5']],
  50: [[1, '50']],
  55: [[1, '50'], [1, '5']],
  60: [[1, '50'], [1, '10']],
  65: [[1, '50'], [1, '10'], [1, '5']],
  70: [[1, '50'], [1, '20']],
  75: [[1, '50'], [1, '25']],
  80: [[1, '100'], [-1, '20']],
  85: [[1, '100'], [-1, '10'], [-1, '5']],
  90: [[1, '100'], [-1, '10']],
  95: [[1, '100'], [-1, '5']],
};

/** Blocks that are derived from another block. */
const PARENT: Partial<Record<Block, Block>> = { '5': '10', '20': '10', '25': '50' };

/** The order blocks are found in, so each one's parent comes first. */
const FIND_ORDER: Block[] = ['50', '25', '10', '20', '5', '1'];

export function blockValue(block: Block, x: number): number {
  switch (block) {
    case '100':
      return x;
    case '50':
      return x / 2;
    case '25':
      return x / 4;
    case '20':
      return (x / 10) * 2;
    case '10':
      return x / 10;
    case '5':
      return x / 10 / 2;
    case '1':
      return x / 100;
  }
}

function findStep(block: Block, x: number): Step {
  const v = dec(round2(blockValue(block, x)));
  switch (block) {
    case '50':
      return { text: '50% is half: ' + num(x) + ' ÷ 2 = ' + v + '.' };
    case '25':
      return { text: '25% is half of that again: ' + dec(round2(x / 2)) + ' ÷ 2 = ' + v + '.' };
    case '10':
      return {
        text: '10% of ' + num(x) + ': move the decimal point one place left → ' + v + '.',
      };
    case '20':
      return { text: '20% is double 10%: ' + dec(round2(x / 10)) + ' × 2 = ' + v + '.' };
    case '5':
      return { text: '5% is half of 10%: ' + dec(round2(x / 10)) + ' ÷ 2 = ' + v + '.' };
    case '1':
      return { text: '1% of ' + num(x) + ': move the decimal point two places left → ' + v + '.' };
    case '100':
      return { text: '100% is all of it: ' + num(x) + '.' };
  }
}

/** The action for the first block, without its value — used as a hint. */
function hintFor(block: Block, x: number): string {
  switch (block) {
    case '50':
      return 'Start with 50%: halve ' + num(x) + '.';
    case '1':
      return 'Start with 1% of ' + num(x) + ': move the decimal point two places left.';
    default:
      return 'Start with 10% of ' + num(x) + ': move the decimal point one place left.';
  }
}

export interface PercentWork {
  value: number;
  steps: Step[];
  hint: string;
}

export function hasPlan(p: number): boolean {
  return p in PLANS;
}

/** "35% = 3 × 10% + 5%" */
function describePlan(p: number, plan: Plan): string {
  return (
    p +
    '% = ' +
    plan
      .map(([c, b], i) => {
        const sign = c < 0 ? (i === 0 ? '−' : ' − ') : i === 0 ? '' : ' + ';
        const mag = Math.abs(c);
        const label = b === '100' ? 'all of it' : b + '%';
        return sign + (mag === 1 ? label : mag + ' × ' + label);
      })
      .join('')
  );
}

/** p% of x, done with blocks. Throws for a p with no plan (a generator bug). */
export function percentOf(p: number, x: number): PercentWork {
  const plan = PLANS[p];
  if (!plan) throw new Error('No block plan for ' + p + '%');

  const needed = new Set<Block>();
  for (const [, b] of plan) {
    needed.add(b);
    const parent = PARENT[b];
    if (parent) needed.add(parent);
  }
  const order = FIND_ORDER.filter((b) => needed.has(b));
  const steps = order.map((b) => findStep(b, x));

  const value = round2(plan.reduce((sum, [c, b]) => sum + c * blockValue(b, x), 0));
  const single = plan.length === 1 && plan[0]?.[0] === 1;
  if (!single && plan.length === 1) {
    // One block, scaled: "3% = 3 × 1%: 3 × 4.5 = 13.5."
    const [c, b] = plan[0] as [number, Block];
    steps.push({
      text: describePlan(p, plan) + ': ' + c + ' × ' + dec(round2(blockValue(b, x))) + ' = ' + dec(value) + '.',
    });
  } else if (!single) {
    const parts = plan
      .map(([c, b], i) => {
        const v = dec(round2(Math.abs(c) * blockValue(b, x)));
        return i === 0 ? (c < 0 ? '−' + v : v) : (c < 0 ? ' − ' : ' + ') + v;
      })
      .join('');
    steps.push({ text: describePlan(p, plan) + ': ' + parts + ' = ' + dec(value) + '.' });
  }

  return { value, steps, hint: hintFor(order[0] ?? '10', x) };
}
