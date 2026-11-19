/**
 * Read-only summaries of AppData for the dashboard screens (Home, Learn,
 * Progress). Pure, so they are unit-tested without a browser.
 */

import { SKILLS } from '../skills/registry';
import type { Category } from '../skills/types';
import type { AppData } from '../storage/schema';
import { statusOf } from './curriculum';
import { dayKey } from './progress';
import { isMastered, mastery, recentAccuracy } from './scheduler';

export interface WeekDay {
  key: string;
  /** Single-letter weekday label: M, T, W ... */
  label: string;
  practised: boolean;
  isToday: boolean;
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The last seven local days, oldest first, ending today. */
export function weekStrip(days: string[], now: number): WeekDay[] {
  const set = new Set(days);
  const out: WeekDay[] = [];
  const today = new Date(now);
  for (let back = 6; back >= 0; back--) {
    // Noon avoids DST edges when stepping back whole days.
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back, 12);
    const key = dayKey(d.getTime());
    out.push({ key, label: LETTERS[d.getDay()] as string, practised: set.has(key), isToday: back === 0 });
  }
  return out;
}

export interface CategoryStats {
  category: Category;
  total: number;
  learned: number;
  mastered: number;
  /** Lifetime accuracy across this category's practice, null if none yet. */
  accuracy: number | null;
  problems: number;
}

export function categoryStats(data: AppData, category: Category): CategoryStats {
  const skills = SKILLS.filter((s) => s.category === category);
  let learned = 0;
  let mastered = 0;
  let problems = 0;
  let correct = 0;
  for (const s of skills) {
    const p = data.skills[s.id];
    if (!p) continue;
    learned++;
    if (isMastered(p)) mastered++;
    problems += p.total;
    correct += p.correct;
  }
  return { category, total: skills.length, learned, mastered, accuracy: problems ? correct / problems : null, problems };
}

/** Learned skills that are due for review right now. */
export function dueCount(data: AppData, now: number): number {
  return Object.values(data.skills).filter((p) => now >= p.dueAt && p.total > 0).length;
}

/** Overall lifetime accuracy, null before the first answer. */
export function overallAccuracy(data: AppData): number | null {
  const all = Object.values(data.skills);
  const total = all.reduce((a, p) => a + p.total, 0);
  return total ? all.reduce((a, p) => a + p.correct, 0) / total : null;
}

/** "Good morning" / "Good afternoon" / "Good evening" for the local hour. */
export function greeting(now: number): string {
  const h = new Date(now).getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export type SkillBadge = 'locked' | 'ready' | 'learning' | 'mastered';

export function skillBadge(data: AppData, id: string): SkillBadge {
  const skill = SKILLS.find((s) => s.id === id);
  if (!skill) return 'locked';
  const status = statusOf(data, skill);
  if (status === 'locked') return 'locked';
  if (status === 'available') return 'ready';
  const p = data.skills[id];
  return p && isMastered(p) ? 'mastered' : 'learning';
}

/** Recent accuracy as a whole percent, or null with too little data. */
export function recentPercent(data: AppData, id: string): number | null {
  const p = data.skills[id];
  const acc = p ? recentAccuracy(p) : null;
  return acc === null ? null : Math.round(acc * 100);
}

/**
 * Best (lowest) average time of any earlier session with at least 5 problems,
 * so the summary can say "new personal best".
 */
export function bestSessionAvg(data: AppData): number | null {
  const timed = data.sessions.filter((s) => s.avgMs !== null && s.n >= 5).map((s) => s.avgMs as number);
  return timed.length ? Math.min(...timed) : null;
}

/** Longest run of consecutive right answers in a list of results. */
export function longestRun(oks: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const ok of oks) {
    run = ok ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Current run of right answers at the end of the list. */
export function currentRun(oks: boolean[]): number {
  let run = 0;
  for (let i = oks.length - 1; i >= 0 && oks[i]; i--) run++;
  return run;
}

/**
 * Skills worth a quick practice right now, best first: due ones before
 * not-yet-due, then the least mastered. Only learned skills.
 */
export function reviewPicks(data: AppData, now: number, n: number): string[] {
  return SKILLS.filter((s) => s.id in data.skills)
    .map((s) => {
      const p = data.skills[s.id] as NonNullable<AppData['skills'][string]>;
      return { id: s.id, due: now >= p.dueAt ? 1 : 0, m: mastery(p) };
    })
    .sort((a, b) => b.due - a.due || a.m - b.m)
    .slice(0, n)
    .map((x) => x.id);
}
