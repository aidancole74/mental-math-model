/** Formatting and arithmetic helpers shared by skill generators. */

import type { Meta } from './types';

/** 1234567 -> "1,234,567". Accepts a pre-formatted string so "1234.50" keeps its cents. */
export function num(n: number | string): string {
  const text = String(n);
  const negative = text.startsWith('-');
  const body = negative ? text.slice(1) : text;
  const [whole = '', frac] = body.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (negative ? '-' : '') + grouped + (frac ? '.' + frac : '');
}

/** Round to cents, avoiding float dust. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/** 64 -> "$64"   63.4 -> "$63.40" */
export function money(n: number): string {
  const v = round2(n);
  return Number.isInteger(v) ? '$' + num(v) : '$' + num(v.toFixed(2));
}

/** 64 -> "64 dollars"   63.4 -> "63 dollars and 40 cents" */
export function spokenMoney(n: number): string {
  const v = round2(n);
  const whole = Math.floor(v);
  const cents = Math.round((v - whole) * 100);
  const dollars = whole + (whole === 1 ? ' dollar' : ' dollars');
  if (cents === 0) return dollars;
  return dollars + ' and ' + cents + (cents === 1 ? ' cent' : ' cents');
}

/**
 * Money used before a noun: "a 90-dollar jacket", not "a 90 dollars jacket".
 * Speech engines read the hyphen as a pause-free join. Amounts with cents
 * have no natural adjective form, so they fall back to spokenMoney.
 */
export function spokenMoneyAdj(n: number): string {
  const v = round2(n);
  return Number.isInteger(v) ? v + '-dollar' : spokenMoney(v);
}

/** Number for display, trimming float dust: 9.0 -> "9", 9.6 -> "9.6" */
export function dec(n: number): string {
  return num(round2(n));
}

/** Digits of an integer, most significant first. */
export function digitsOf(n: number): number[] {
  return String(Math.abs(Math.trunc(n)))
    .split('')
    .map((d) => Number(d));
}

export function sumDigits(n: number): number {
  return digitsOf(n).reduce((a, b) => a + b, 0);
}

/** Reads a numeric field out of problem.meta, with a clear error if absent. */
export function metaNum(meta: Meta, key: string): number {
  const v = meta[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error('meta.' + key + ' is not a finite number (got ' + String(v) + ')');
  }
  return v;
}

/** Reads a string field out of problem.meta. */
export function metaStr(meta: Meta, key: string): string {
  const v = meta[key];
  if (typeof v !== 'string') {
    throw new Error('meta.' + key + ' is not a string (got ' + String(v) + ')');
  }
  return v;
}
