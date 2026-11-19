/**
 * Everything the app remembers, as one versioned JSON blob.
 * Kept small on purpose (a few KB) so it fits in localStorage and a backup
 * file is a single readable JSON document.
 */

import type { Difficulty } from '../skills/types';

export const DATA_VERSION = 1;

export type Box = 1 | 2 | 3 | 4 | 5;

/** One answered practice problem, as stored in a skill's recent history. */
export interface Attempt {
  at: number;
  ok: boolean;
  ms: number;
  d: Difficulty;
  /** Answered after looking at the hint. Counts as correct, never promotes. */
  hint: boolean;
  /** The "fast" target for this problem in ms, if the skill sets its own. */
  t?: number;
}

export interface SkillProgress {
  learnedAt: number;
  /** Leitner box: 1 = new or shaky ... 5 = solid. */
  box: Box;
  /** When this skill is next due for review (ms since epoch). */
  dueAt: number;
  /** The last few attempts, oldest first. */
  recent: Attempt[];
  total: number;
  correct: number;
  /** Fastest correct, un-hinted answer. Personal best. */
  fastestMs: number | null;
  lastAt: number | null;
}

export interface SessionRecord {
  at: number;
  n: number;
  correct: number;
  /** Mean time of correct answers; null if none were correct. */
  avgMs: number | null;
  skillIds: string[];
}

export interface Mistake {
  /** Rebuildable with problemFromId(), so "show me how" works later. */
  problemId: string;
  skillId: string;
  given: string;
  at: number;
}

export type SessionKind = 'count' | 'time';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  sessionKind: SessionKind;
  /** false = relaxed, no visible clock. true = per-problem countdown. */
  challenge: boolean;
  theme: Theme;
  voice: boolean;
}

export interface AppData {
  version: typeof DATA_VERSION;
  settings: Settings;
  skills: Record<string, SkillProgress>;
  sessions: SessionRecord[];
  mistakes: Mistake[];
  /** Local dates (YYYY-MM-DD) with at least one answered problem. */
  days: string[];
}

export const SESSION_COUNT = 10;
export const SESSION_SECONDS = 120;
export const MAX_SESSIONS = 500;
export const MAX_MISTAKES = 50;
export const RECENT_ATTEMPTS = 12;

export function defaultSettings(): Settings {
  return { sessionKind: 'count', challenge: false, theme: 'system', voice: false };
}

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    settings: defaultSettings(),
    skills: {},
    sessions: [],
    mistakes: [],
    days: [],
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Light structural check for data read from storage or a backup file.
 * Returns a cleaned AppData, or null if the blob is not ours.
 * Unknown settings fall back to defaults rather than failing the whole load.
 */
export function validate(raw: unknown): AppData | null {
  if (!isObj(raw) || raw.version !== DATA_VERSION) return null;
  if (!isObj(raw.skills) || !Array.isArray(raw.sessions) || !Array.isArray(raw.mistakes)) return null;

  const skills: Record<string, SkillProgress> = {};
  for (const [id, p] of Object.entries(raw.skills)) {
    if (!isObj(p)) continue;
    const box = Number(p.box);
    if (![1, 2, 3, 4, 5].includes(box) || typeof p.learnedAt !== 'number') continue;
    skills[id] = {
      learnedAt: p.learnedAt,
      box: box as Box,
      dueAt: typeof p.dueAt === 'number' ? p.dueAt : 0,
      recent: Array.isArray(p.recent) ? (p.recent as Attempt[]).filter(isObj) : [],
      total: typeof p.total === 'number' ? p.total : 0,
      correct: typeof p.correct === 'number' ? p.correct : 0,
      fastestMs: typeof p.fastestMs === 'number' ? p.fastestMs : null,
      lastAt: typeof p.lastAt === 'number' ? p.lastAt : null,
    };
  }

  const s = isObj(raw.settings) ? raw.settings : {};
  const d = defaultSettings();
  const settings: Settings = {
    sessionKind: s.sessionKind === 'time' ? 'time' : d.sessionKind,
    challenge: typeof s.challenge === 'boolean' ? s.challenge : d.challenge,
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : d.theme,
    voice: typeof s.voice === 'boolean' ? s.voice : d.voice,
  };

  return {
    version: DATA_VERSION,
    settings,
    skills,
    sessions: (raw.sessions as SessionRecord[]).filter(isObj).slice(-MAX_SESSIONS),
    mistakes: (raw.mistakes as Mistake[]).filter(isObj).slice(-MAX_MISTAKES),
    days: Array.isArray(raw.days) ? raw.days.filter((x): x is string => typeof x === 'string') : [],
  };
}
