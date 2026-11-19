/**
 * Estimating "what percent is part of whole" without long division:
 * count how many 10% chunks fit, then size the leftover in 1% chunks.
 *
 *   14 of 83: 10% is 8.3 → one chunk, 5.7 left → 1% is 0.83, so ≈ 7 more → ≈ 17%
 */

import { dec, num, round2 } from '../helpers';
import type { Step } from '../types';

/**
 * True when a number the walkthrough will show (the part, the whole, its 10%...)
 * is within 0.5 of the answer — "what percent of 40 is 16?" is 40%. Generators
 * skip these: they give the answer away by coincidence.
 */
export function looksLikeAnswer(answer: number, shown: number[]): boolean {
  return shown.some((v) => Math.abs(v - answer) < 0.5);
}

export interface PercentEstimate {
  estimate: number;
  steps: Step[];
}

export function estimatePercent(part: number, whole: number): PercentEstimate {
  const ten = whole / 10;
  const chunks = Math.floor(part / ten);
  const left = part - chunks * ten;
  const ones = Math.round(left / (whole / 100));
  const estimate = chunks * 10 + ones;

  const steps: Step[] = [
    {
      text: '10% of ' + num(whole) + ' is ' + dec(round2(ten)) + '.',
      detail: 'Use it as a measuring stick.',
    },
    {
      text:
        num(part) +
        ' holds ' +
        chunks +
        ' of those' +
        ' (' +
        chunks * 10 +
        '%), with ' +
        dec(round2(left)) +
        ' left over.',
    },
    {
      text: '1% is ' + dec(round2(whole / 100)) + ', so the leftover is about ' + ones + '% more: roughly ' + estimate + '%.',
    },
  ];
  return { estimate, steps };
}
