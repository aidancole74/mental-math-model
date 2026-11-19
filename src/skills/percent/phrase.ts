/**
 * Builds a problem's on-screen prompt and its spoken twin from one template,
 * so the two can never drift apart.
 *
 *   phrase('A {price-} jacket is {pct}% off.', { price: moneyAdj(84), pct: n(30) })
 *   -> prompt: 'A $84 jacket is 30% off.'
 *   -> spoken: 'A 84-dollar jacket is 30 percent off.'
 *
 * {key} uses the noun form; {key-} the adjective form (before a noun).
 */

import { money, num, round2, spokenMoney, spokenMoneyAdj } from '../helpers';

export interface Slot {
  show: string;
  say: string;
  sayAdj?: string;
  /** The number itself, so {an:key} can choose "a" or "an". */
  value?: number;
}

export const m = (v: number): Slot => ({ show: money(v), say: spokenMoney(v), sayAdj: spokenMoneyAdj(v), value: v });
export const n = (v: number): Slot => ({ show: num(v), say: String(v), value: v });

/**
 * "a" or "an" before a number, by how it sounds: AN 8, AN 18%, AN $841,
 * AN 11-dollar..., but A 1,100 ("one thousand one hundred").
 */
export function article(v: number): 'a' | 'an' {
  const digits = String(Math.floor(Math.abs(v)));
  if (digits.startsWith('8')) return 'an';
  if (digits.length % 3 === 2 && (digits.startsWith('11') || digits.startsWith('18'))) return 'an';
  return 'a';
}

export function phrase(template: string, slots: Record<string, Slot>): { prompt: string; spoken: string } {
  // Articles first: {an:x} -> "a"/"an", {An:x} -> "A"/"An".
  const withArticles = template.replace(/\{(an|An):(\w+)\}/g, (_, form: string, key: string) => {
    const v = slots[key]?.value;
    if (v === undefined) throw new Error('No value for article slot ' + key);
    const a = article(v);
    return form === 'An' ? a[0]?.toUpperCase() + a.slice(1) : a;
  });
  let prompt = withArticles;
  let spoken = withArticles;
  for (const [key, slot] of Object.entries(slots)) {
    prompt = prompt.split('{' + key + '-}').join(slot.show).split('{' + key + '}').join(slot.show);
    spoken = spoken
      .split('{' + key + '-}')
      .join(slot.sayAdj ?? slot.say)
      .split('{' + key + '}')
      .join(slot.say);
  }
  spoken = spoken.replace(/(\d)%/g, '$1 percent').replace(/≈/g, 'about');
  return { prompt, spoken };
}

/** ±10% of the exact answer, never zero. */
export function tenPercent(answer: number): number {
  return Math.max(0.01, round2(Math.abs(answer) * 0.1));
}

/** Rounds to a friendly number: nearest 1 under 20, nearest 5 under 100, else nearest 10. */
export function friendly(x: number): number {
  if (x < 20) return Math.round(x);
  if (x < 100) return Math.round(x / 5) * 5;
  if (x < 1000) return Math.round(x / 10) * 10;
  return Math.round(x / 100) * 100;
}

/**
 * Rounding for estimates: nearest $1 under 100, $5 under 500, $10 above.
 * Keeps the rounding error under ~3.5%, well inside the 10% band.
 */
export function roundForEstimate(x: number): number {
  if (x < 100) return Math.round(x);
  if (x < 500) return Math.round(x / 5) * 5;
  return Math.round(x / 10) * 10;
}

/** Closing line for estimate walkthroughs: the exact answer and what counts. */
export function exactLine(answer: number, tolerance: number, fmt: (v: number) => string): string {
  return (
    'Exact answer: ' +
    fmt(answer) +
    '. Anything from ' +
    fmt(round2(Math.max(0, answer - tolerance))) +
    ' to ' +
    fmt(round2(answer + tolerance)) +
    ' counts.'
  );
}

/** A price that looks real: $79.99, $34.49, $112.37 ... */
export function uglyPrice(base: number, cents: number): number {
  return round2(base + cents / 100);
}
