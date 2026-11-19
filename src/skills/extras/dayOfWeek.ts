import { defineSkill } from '../define';
import { metaNum } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Rng, Step } from '../types';

/**
 * Day of the week for any date from 1800 to 2099:
 *   (date + month code + year code + century code) mod 7, with Sunday = 0.
 * meta: { y, m, d } — m is 1–12.
 */

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Month codes: 033 614 625 035. */
export const MONTH_CODES = [0, 3, 3, 6, 1, 4, 6, 2, 5, 0, 3, 5];
export const CENTURY_CODES: Record<number, number> = { 18: 2, 19: 0, 20: 6 };

export function isLeap(y: number): boolean {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}

export function daysIn(y: number, m: number): number {
  if (m === 2) return isLeap(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

export interface DayPlan {
  yy: number;
  quarter: number;
  yearCode: number;
  century: number;
  /** Month code after the leap-year adjustment. */
  month: number;
  leapAdjusted: boolean;
  total: number;
  day: number;
}

export function dayPlan(y: number, m: number, d: number): DayPlan {
  const yy = y % 100;
  const quarter = Math.floor(yy / 4);
  const yearCode = (yy + quarter) % 7;
  const century = CENTURY_CODES[Math.floor(y / 100)];
  if (century === undefined) throw new Error('No century code for ' + y);
  const leapAdjusted = m <= 2 && isLeap(y);
  // One less in a leap January/February; 0 − 1 wraps round to 6.
  const raw = MONTH_CODES[m - 1] ?? 0;
  const month = leapAdjusted ? (raw + 6) % 7 : raw;
  const total = d + month + yearCode + century;
  return { yy, quarter, yearCode, century, month, leapAdjusted, total, day: ((total % 7) + 7) % 7 };
}

export function dateText(y: number, m: number, d: number): string {
  return d + ' ' + MONTHS[m - 1] + ' ' + y;
}

function generate(difficulty: Difficulty, rng: Rng): ProblemSpec {
  const y = difficulty === 1 ? rng.int(2000, 2030) : difficulty === 2 ? rng.int(1900, 2099) : rng.int(1800, 2099);
  // Level 3 leans on the January/February leap-year exception now and then.
  const m = difficulty === 3 && isLeap(y) && rng.chance(0.4) ? rng.int(1, 2) : rng.int(1, 12);
  const d = rng.int(1, daysIn(y, m));
  const text = dateText(y, m, d);
  return {
    // Non-breaking spaces keep the date on one line.
    prompt: 'What day of the week is ' + text.replace(/ /g, '\u00a0') + '?',
    spoken: 'What day of the week is ' + text + '?',
    answer: dayPlan(y, m, d).day,
    answerKind: 'choice',
    choices: DAYS,
    meta: { y, m, d },
  };
}

function solve(problem: Problem): Step[] {
  const y = metaNum(problem.meta, 'y');
  const m = metaNum(problem.meta, 'm');
  const d = metaNum(problem.meta, 'd');
  const p = dayPlan(y, m, d);
  const yy2 = String(p.yy).padStart(2, '0');
  const yearSum = p.yy + p.quarter;
  const sevens = yearSum - p.yearCode;
  const totalSevens = p.total - p.day;
  return [
    {
      text:
        'Year code: ' + yy2 + ' + ' + p.quarter + ' (' + yy2 + ' ÷ 4, dropping any remainder) = ' + yearSum +
        (sevens ? ', minus ' + sevens + ' (a multiple of 7) = ' + p.yearCode : '') + '.',
      detail: 'Each year shifts the calendar one day, and each leap year one more.',
    },
    { text: 'Century code for the ' + Math.floor(y / 100) + '00s: ' + p.century + '.', detail: '1800s: 2, 1900s: 0, 2000s: 6.' },
    {
      text:
        'Month code for ' + MONTHS[m - 1] + ': ' + p.month +
        (p.leapAdjusted
          ? ' — one less than usual' + (p.month === 6 ? ' (0 wraps round to 6)' : '') + ', because ' + y + ' is a leap year and its extra day comes later'
          : '') + '.',
      detail: 'Month codes: 033 614 625 035.',
    },
    {
      text:
        'Add the date: ' + d + ' + ' + p.month + ' + ' + p.yearCode + ' + ' + p.century + ' = ' + p.total +
        (totalSevens ? ', minus ' + totalSevens + ' = ' + p.day : '') + '.',
      detail: 'Taking away 7s doesn’t change the weekday.',
    },
    { text: 'Day ' + p.day + ' (counting Sunday as 0) is ' + DAYS[p.day] + '.' },
  ];
}

export const dayOfWeek = defineSkill({
  id: 'day-of-week',
  title: 'Day of the week for any date',
  blurb: 'Add four small codes and throw away the 7s.',
  category: 'extras',
  order: 600,
  prereqs: [],
  targetSeconds: [30, 40, 60],
  truth: (meta: Meta) => new Date(Date.UTC(metaNum(meta, 'y'), metaNum(meta, 'm') - 1, metaNum(meta, 'd'))).getUTCDay(),
  lesson: {
    idea: [
      'Number the days Sunday 0 to Saturday 6. Any date’s weekday is the date plus three codes — month, year and century — with the 7s thrown away.',
      'Month codes are 033 614 625 035 (January to December). The year code is the last two digits plus a quarter of them. The 1900s add 0, the 2000s add 6, the 1800s add 2. In a leap year, January and February get one less.',
    ],
    worked: {
      prompt: 'What day of the week is 14 March 1987?',
      steps: [
        { text: 'Year code: 87 + 21 = 108, minus 105 = 3.' },
        { text: 'Century: 1900s = 0. Month: March = 3.' },
        { text: '14 + 3 + 3 + 0 = 20, minus 14 = 6.' },
        { text: 'Day 6 is Saturday.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 6001 },
      { difficulty: 1, seed: 6002 },
      { difficulty: 2, seed: 6003 },
    ],
  },
  generate,
  solve,
  constraints: [
    { name: 'the date exists', test: (p) => metaNum(p.meta, 'd') <= daysIn(metaNum(p.meta, 'y'), metaNum(p.meta, 'm')) },
    { name: 'difficulty 1 stays in 2000–2030', difficulty: 1, test: (p) => metaNum(p.meta, 'y') >= 2000 && metaNum(p.meta, 'y') <= 2030 },
    { name: 'within 1800–2099', test: (p) => metaNum(p.meta, 'y') >= 1800 && metaNum(p.meta, 'y') <= 2099 },
  ],
});
