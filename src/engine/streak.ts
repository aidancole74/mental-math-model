/**
 * A forgiving daily streak.
 *
 * A streak counts practice days. Missing ONE day doesn't break it — a gap of
 * two or more days in a row does. So practising Mon, Wed, Thu is a 3-day
 * streak, and a single busy day never wipes out weeks of work.
 */

const DAY = 86_400_000;

/** "2026-11-12" -> whole days since the epoch (calendar math, immune to DST). */
function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}

/** Largest allowed gap between two practice days: 2 = one day skipped. */
export const MAX_GAP_DAYS = 2;

export type StreakState =
  /** Practised today. */
  | 'done-today'
  /** Practised yesterday; today is still open. */
  | 'open'
  /** Missed yesterday — the one free pass is in use. Practise today to keep it. */
  | 'grace'
  /** No streak running. */
  | 'none';

export interface Streak {
  current: number;
  best: number;
  state: StreakState;
}

export function computeStreak(days: string[], today: string): Streak {
  const nums = Array.from(new Set(days.map(dayNumber))).sort((a, b) => a - b);
  if (nums.length === 0) return { current: 0, best: 0, state: 'none' };

  let best = 1;
  let run = 1;
  for (let i = 1; i < nums.length; i++) {
    run = (nums[i] as number) - (nums[i - 1] as number) <= MAX_GAP_DAYS ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const sinceLast = dayNumber(today) - (nums[nums.length - 1] as number);
  if (sinceLast > MAX_GAP_DAYS) return { current: 0, best, state: 'none' };
  const state: StreakState = sinceLast === 0 ? 'done-today' : sinceLast === 1 ? 'open' : 'grace';
  return { current: run, best, state };
}

export function streakMessage(s: Streak): string {
  switch (s.state) {
    case 'done-today':
      return 'Done for today. See you tomorrow.';
    case 'open':
      return 'Practise today to add a day.';
    case 'grace':
      return 'You missed yesterday — that one’s free. Practise today to keep it going.';
    case 'none':
      return s.best > 0 ? 'Start a new streak today.' : 'Practise today to start a streak.';
  }
}
