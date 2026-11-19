/**
 * Pure updates to AppData. The store calls these and persists the result;
 * tests call them directly.
 */

import { getSkill } from '../skills/registry';
import type { Problem } from '../skills/types';
import {
  MAX_MISTAKES,
  MAX_SESSIONS,
  type AppData,
  type SessionRecord,
  type Settings,
} from '../storage/schema';
import { applyAttempt, newProgress, targetMsFor } from './scheduler';

/** Local calendar date, YYYY-MM-DD. Streaks follow the user's own day. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

export function withLearned(data: AppData, skillId: string, now: number): AppData {
  if (data.skills[skillId]) return data;
  return { ...data, skills: { ...data.skills, [skillId]: newProgress(now) } };
}

export interface AnswerInput {
  problem: Problem;
  ok: boolean;
  ms: number;
  hint: boolean;
  /** What the user entered; null when the clock ran out. */
  given: string | null;
}

/**
 * Records one practice answer: updates the skill's box and stats, marks today
 * as a practice day, and logs a miss for the review list.
 *
 * Practising a skill that was never formally learned (reachable from a skill's
 * page or a direct link) counts as learning it, so the answer is never lost.
 */
export function withAttempt(data: AppData, input: AnswerInput, now: number): AppData {
  const { problem } = input;
  const current = data.skills[problem.skillId] ?? newProgress(now);
  const skills = {
    ...data.skills,
    [problem.skillId]: applyAttempt(current, {
      at: now,
      ok: input.ok,
      ms: input.ms,
      d: problem.difficulty,
      hint: input.hint,
      t: targetMsFor(getSkill(problem.skillId), problem.difficulty),
    }),
  };

  const today = dayKey(now);
  const days = data.days.includes(today) ? data.days : [...data.days, today];

  const mistakes = input.ok
    ? data.mistakes
    : [
        ...data.mistakes.filter((m) => m.problemId !== problem.id),
        { problemId: problem.id, skillId: problem.skillId, given: input.given ?? '', at: now },
      ].slice(-MAX_MISTAKES);

  return { ...data, skills, days, mistakes };
}

export function withSession(data: AppData, record: SessionRecord): AppData {
  return { ...data, sessions: [...data.sessions, record].slice(-MAX_SESSIONS) };
}

export function withSettings(data: AppData, patch: Partial<Settings>): AppData {
  return { ...data, settings: { ...data.settings, ...patch } };
}

export function withoutMistake(data: AppData, problemId: string): AppData {
  return { ...data, mistakes: data.mistakes.filter((m) => m.problemId !== problemId) };
}
