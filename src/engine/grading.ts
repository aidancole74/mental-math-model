import type { Problem } from '../skills/types';

/** Turns keypad (or typed) input into a number. "$1,234.5" -> 1234.5. */
export function parseAnswer(input: string): number | null {
  const s = input.replace(/[$,\s]/g, '');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Decimal places a problem is typed and graded to (2 = cents, the default). */
export function decimalsOf(problem: Problem): number {
  return problem.decimals ?? 2;
}

/**
 * Estimate problems pass within their tolerance; whole-number and choice
 * answers must match exactly; money and decimals match to the problem's
 * decimal places — the cent by default ("9.6" == "9.60"), 3 places for
 * fractions ("0.375").
 */
export function isCorrect(problem: Problem, given: number): boolean {
  if (problem.tolerance !== undefined) {
    return Math.abs(given - problem.answer) <= problem.tolerance + 1e-9;
  }
  if (problem.answerKind === 'integer' || problem.answerKind === 'choice') return given === problem.answer;
  return Math.abs(given - problem.answer) < 0.5 * 10 ** -decimalsOf(problem);
}

/** Display form of the expected answer, e.g. "$9.60", "1,225" or "Tuesday". */
export function formatAnswer(problem: Problem): string {
  return formatValue(problem, problem.answer);
}

/** Any value in the problem's own format (unit, suffix, decimals, choice label). */
export function formatValue(problem: Problem, v: number): string {
  if (problem.answerKind === 'choice') return problem.choices?.[v] ?? String(v);
  const places = decimalsOf(problem);
  const text =
    problem.answerKind === 'money' && !Number.isInteger(v)
      ? v.toFixed(2)
      : String(Math.round(v * 10 ** places) / 10 ** places);
  const [whole = '', frac] = text.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (problem.unit ?? '') + grouped + (frac ? '.' + frac : '') + (problem.suffix ?? '');
}

/** What the user entered, for the mistakes list: "$9.5", "48%", "Monday". */
export function formatGiven(problem: Problem, given: string): string {
  if (problem.answerKind === 'choice') {
    const i = parseAnswer(given);
    return (i !== null && problem.choices?.[i]) || given;
  }
  return (problem.unit ?? '') + given + (problem.suffix ?? '');
}

/** "$13.52 to $16.52" — the accepted range for an estimate problem. */
export function formatRange(problem: Problem): string | null {
  if (problem.tolerance === undefined) return null;
  const lo = Math.max(0, problem.answer - problem.tolerance);
  const hi = problem.answer + problem.tolerance;
  return formatValue(problem, round2(lo)) + ' to ' + formatValue(problem, round2(hi));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
