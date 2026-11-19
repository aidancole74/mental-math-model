/**
 * The smart mix: a small Leitner-box system.
 *
 * Each learned skill sits in box 1-5. A fast, correct, un-hinted answer moves
 * it up one box, but only once the skill is due, so it can't race to box 5
 * in a single sitting. A miss drops it one box and makes it due again now.
 * Picking favours skills that are inaccurate, slow, due or in low boxes, plus
 * a slice of pure random review.
 */

import type { Difficulty, Rng, SkillDef } from '../skills/types';
import { RECENT_ATTEMPTS, type Attempt, type Box, type SkillProgress } from '../storage/schema';

const DAY = 24 * 60 * 60 * 1000;

/** Days until a skill in this box is due again. Index = box. */
export const BOX_INTERVAL_DAYS = [0, 0, 1, 2, 4, 8] as const;

/** "Fast" means at or under this many ms. */
export const TARGET_MS: Record<Difficulty, number> = { 1: 6000, 2: 10000, 3: 15000 };

/** The "fast" target for a skill at a difficulty, honouring skill overrides. */
export function targetMsFor(skill: Pick<SkillDef, 'targetSeconds'>, d: Difficulty): number {
  const custom = skill.targetSeconds?.[d - 1];
  return custom !== undefined ? custom * 1000 : TARGET_MS[d];
}

function targetOf(a: Attempt): number {
  return a.t ?? TARGET_MS[a.d];
}

/** Share of picks that ignore weighting entirely: light random review. */
export const RANDOM_REVIEW_SHARE = 0.15;

export function newProgress(now: number): SkillProgress {
  return { learnedAt: now, box: 1, dueAt: now, recent: [], total: 0, correct: 0, fastestMs: null, lastAt: null };
}

/** Accuracy over recent attempts; null until there are at least 3. */
export function recentAccuracy(p: SkillProgress): number | null {
  if (p.recent.length < 3) return null;
  return p.recent.filter((a) => a.ok).length / p.recent.length;
}

/** Median time of recent correct answers, relative to each one's target. 1 = on target. */
export function speedRatio(p: SkillProgress): number | null {
  const ratios = p.recent.filter((a) => a.ok).map((a) => a.ms / targetOf(a));
  if (ratios.length === 0) return null;
  ratios.sort((a, b) => a - b);
  const mid = Math.floor(ratios.length / 2);
  return ratios.length % 2 ? (ratios[mid] as number) : ((ratios[mid - 1] as number) + (ratios[mid] as number)) / 2;
}

/** Mean time of recent correct answers in ms. */
export function averageMs(p: SkillProgress): number | null {
  const times = p.recent.filter((a) => a.ok).map((a) => a.ms);
  return times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
}

export function isMastered(p: SkillProgress): boolean {
  const acc = recentAccuracy(p);
  return p.box >= 4 && acc !== null && acc >= 0.85;
}

/** 0..1 for the mastery bar: mostly box, partly recent accuracy. */
export function mastery(p: SkillProgress): number {
  const boxPart = (p.box - 1) / 4;
  const acc = recentAccuracy(p) ?? 0;
  return Math.max(0, Math.min(1, 0.6 * boxPart + 0.4 * acc));
}

/** Harder problems as a skill climbs the boxes, with some overlap. */
export function difficultyFor(p: SkillProgress, rng: Rng): Difficulty {
  const r = rng.next();
  switch (p.box) {
    case 1:
      return 1;
    case 2:
      return r < 0.7 ? 1 : 2;
    case 3:
      return r < 0.2 ? 1 : 2;
    case 4:
      return r < 0.6 ? 2 : 3;
    case 5:
      return r < 0.3 ? 2 : 3;
  }
}

/** Pure: the progress after one more answered problem. */
export function applyAttempt(p: SkillProgress, a: Attempt): SkillProgress {
  const recent = [...p.recent, a].slice(-RECENT_ATTEMPTS);
  let box: Box = p.box;
  let dueAt = p.dueAt;

  if (!a.ok) {
    box = Math.max(1, p.box - 1) as Box;
    dueAt = a.at;
  } else if (!a.hint && a.ms <= targetOf(a) && a.at >= p.dueAt) {
    box = Math.min(5, p.box + 1) as Box;
    dueAt = a.at + BOX_INTERVAL_DAYS[box] * DAY;
  }

  return {
    ...p,
    box,
    dueAt,
    recent,
    total: p.total + 1,
    correct: p.correct + (a.ok ? 1 : 0),
    fastestMs: a.ok && !a.hint ? Math.min(p.fastestMs ?? Infinity, a.ms) : p.fastestMs,
    lastAt: a.at,
  };
}

/** How much a skill deserves to be picked right now. Always > 0. */
export function skillWeight(p: SkillProgress, now: number): number {
  const weakness = 1 - (recentAccuracy(p) ?? 0.6);
  const slowness = Math.max(0, Math.min(1, (speedRatio(p) ?? 1) - 0.8));
  const due = now >= p.dueAt ? 1 : 0;
  const fresh = (6 - p.box) * 0.15;
  return 0.15 + 2.5 * weakness + slowness + due + fresh;
}

export interface Candidate {
  id: string;
  progress: SkillProgress;
}

/**
 * Picks the next skill. Skills served in the last two picks are damped so a
 * session doesn't become ten of the same thing.
 */
export function pickSkill(candidates: Candidate[], now: number, rng: Rng, recentIds: string[]): string {
  if (candidates.length === 0) throw new Error('pickSkill: no candidates');
  if (candidates.length === 1) return (candidates[0] as Candidate).id;

  if (rng.chance(RANDOM_REVIEW_SHARE)) return rng.pick(candidates).id;

  const lastTwo = recentIds.slice(-2);
  const weights = candidates.map((c) => skillWeight(c.progress, now) * (lastTwo.includes(c.id) ? 0.25 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i] as number;
    if (r < 0) return (candidates[i] as Candidate).id;
  }
  return (candidates[candidates.length - 1] as Candidate).id;
}
