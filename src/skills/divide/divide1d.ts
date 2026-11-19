import { defineSkill } from '../define';
import { metaNum, num } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * Short division left to right, by taking away round chunks:
 *   1,764 ÷ 7: 7 × 200 = 1,400 (364 left), 7 × 50 = 350 (14 left), 7 × 2 = 14 → 252
 * meta: { n, d } — the problem is n ÷ d, always exact.
 */

export interface Chunk {
  /** How many d's this chunk takes: 200, 50, 2 ... */
  count: number;
  /** count × d */
  take: number;
  /** What is left afterwards. */
  left: number;
}

/** Works out n ÷ d one place at a time, biggest chunk first. Deliberately not n / d. */
export function chunks(n: number, d: number): Chunk[] {
  const out: Chunk[] = [];
  let left = n;
  for (let place = 10 ** (String(n).length - 1); place >= 1; place /= 10) {
    let k = 0;
    while (left >= (k + 1) * d * place) k++;
    if (k === 0) continue;
    left -= k * d * place;
    out.push({ count: k * place, take: k * d * place, left });
  }
  return out;
}

export function divideByChunks(n: number, d: number): number {
  return chunks(n, d).reduce((sum, c) => sum + c.count, 0);
}

function quotient(rng: Rng, min: number, max: number): number {
  for (;;) {
    const q = rng.int(min, max);
    if (q % 10 !== 0) return q;
  }
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  const d = difficulty === 1 ? rng.int(2, 5) : difficulty === 2 ? rng.int(6, 9) : rng.int(3, 9);
  const q = difficulty === 3 ? quotient(rng, 101, 999) : quotient(rng, 12, 99);
  const n = q * d;
  return {
    prompt: num(n) + ' ÷ ' + d,
    spoken: n + ' divided by ' + d,
    answer: divideByChunks(n, d),
    answerKind: 'integer',
    meta: { n, d },
  };
}

function solve(problem: Problem): Step[] {
  const n = metaNum(problem.meta, 'n');
  const d = metaNum(problem.meta, 'd');
  const cs = chunks(n, d);
  const steps: Step[] = cs.map((c, i) => {
    const from = i === 0 ? n : (cs[i - 1] as Chunk).left;
    const step: Step = {
      text: d + ' × ' + num(c.count) + ' = ' + num(c.take) + (c.left ? ', leaving ' + num(from) + ' − ' + num(c.take) + ' = ' + num(c.left) + '.' : '. Nothing left.'),
    };
    if (i === 0) step.detail = 'Take the biggest round chunk of ' + d + 's that fits, then the next.';
    return step;
  });
  steps.push({ text: 'Add up the chunks: ' + cs.map((c) => num(c.count)).join(' + ') + ' = ' + num(problem.answer) + '.' });
  return steps;
}

export const divide1d = defineSkill({
  id: 'divide-1d',
  title: 'Divide by one digit',
  blurb: 'Take away the biggest round chunk, then the next.',
  category: 'divide',
  order: 400,
  prereqs: ['mult-2x1'],
  targetSeconds: [8, 12, 20],
  truth: (meta: Meta) => metaNum(meta, 'n') / metaNum(meta, 'd'),
  hint: (problem) => {
    const n = metaNum(problem.meta, 'n');
    const d = metaNum(problem.meta, 'd');
    const first = chunks(n, d)[0] as Chunk;
    return 'Start with a big round chunk: ' + d + ' × ' + num(first.count) + ' = ' + num(first.take) + ' fits into ' + num(n) + '.';
  },
  lesson: {
    idea: [
      'Division is multiplication in reverse, so go left to right again. Ask: what is the biggest round number of 7s that fits? Take it away and ask again with what is left.',
      'Add up the chunks you took and you have the answer. You only ever multiply one digit by a round number.',
    ],
    worked: {
      prompt: '1,764 ÷ 7',
      steps: [
        { text: '7 × 200 = 1,400, leaving 364.' },
        { text: '7 × 50 = 350, leaving 14.' },
        { text: '7 × 2 = 14. Nothing left.' },
        { text: '200 + 50 + 2 = 252.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 4001 },
      { difficulty: 1, seed: 4002 },
      { difficulty: 2, seed: 4003 },
    ],
  },
  generate,
  solve,
  constraints: [
    { name: 'divides exactly', test: (p) => metaNum(p.meta, 'n') % metaNum(p.meta, 'd') === 0 },
    { name: 'the answer is never a round ten', test: (p) => p.answer % 10 !== 0 },
    { name: 'difficulty 1 divides by 2 to 5', difficulty: 1, test: (p) => metaNum(p.meta, 'd') <= 5 },
    { name: 'difficulty 2 divides by 6 to 9', difficulty: 2, test: (p) => metaNum(p.meta, 'd') >= 6 },
    { name: 'difficulty 3 has a three-digit answer', difficulty: 3, test: (p) => p.answer >= 100 },
  ],
});
