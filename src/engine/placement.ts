/**
 * Placement quiz: lets someone who already knows some tricks skip their lessons.
 *
 * Skills are tried in curriculum order. Each gets one level-2 problem; if it's
 * right and reasonably quick, a second one confirms it and the skill is placed
 * (learned, box 3). A miss or "I don't know this" moves on. Two misses in a
 * row within a category skip the rest of that category, so the quiz stays short.
 */

import { SKILLS, getSkill, makeProblem } from '../skills/registry';
import type { Category, Problem, Rng } from '../skills/types';
import type { AppData, SkillProgress } from '../storage/schema';
import { BOX_INTERVAL_DAYS, TARGET_MS, newProgress, targetMsFor } from './scheduler';

export type PlacementResult = 'placed' | 'missed' | 'skipped';

export interface PlacementState {
  queue: string[];
  index: number;
  /** 0 = first problem for this skill, 1 = the confirming one. */
  stage: 0 | 1;
  current: Problem | null;
  results: Record<string, PlacementResult>;
  /** Consecutive misses per category. */
  misses: Partial<Record<Category, number>>;
  /** Skills learned before the quiz started — they count as prerequisites. */
  known: string[];
}

export const PLACEMENT_DIFFICULTY = 2;
/** Default limit; skills with their own targetSeconds get proportionally longer. */
export const PLACEMENT_LIMIT_MS = TARGET_MS[PLACEMENT_DIFFICULTY] * 1.5;

export function placementLimitMs(skillId: string): number {
  return targetMsFor(getSkill(skillId), PLACEMENT_DIFFICULTY) * 1.5;
}
export const CATEGORY_GIVE_UP = 2;

function newProblem(skillId: string, rng: Rng): Problem {
  return makeProblem(getSkill(skillId), PLACEMENT_DIFFICULTY, rng.int(1, 2 ** 31 - 1));
}

/** Moves to the next skill worth asking about, marking the rest skipped. */
function seek(state: PlacementState, rng: Rng): PlacementState {
  const results = { ...state.results };
  let index = state.index;
  while (index < state.queue.length) {
    const id = state.queue[index] as string;
    const skill = getSkill(id);
    const prereqsMet = skill.prereqs.every((p) => state.known.includes(p) || results[p] === 'placed');
    const gaveUp = (state.misses[skill.category] ?? 0) >= CATEGORY_GIVE_UP;
    if (prereqsMet && !gaveUp) {
      return { ...state, results, index, stage: 0, current: newProblem(id, rng) };
    }
    results[id] = 'skipped';
    index++;
  }
  return { ...state, results, index, stage: 0, current: null };
}

export function startPlacement(data: AppData, rng: Rng): PlacementState {
  const known = Object.keys(data.skills);
  return seek(
    {
      queue: SKILLS.filter((s) => !known.includes(s.id)).map((s) => s.id),
      index: 0,
      stage: 0,
      current: null,
      results: {},
      misses: {},
      known,
    },
    rng,
  );
}

function settle(state: PlacementState, result: PlacementResult, rng: Rng): PlacementState {
  const id = state.queue[state.index] as string;
  const cat = getSkill(id).category;
  const misses = { ...state.misses, [cat]: result === 'placed' ? 0 : (state.misses[cat] ?? 0) + 1 };
  return seek({ ...state, misses, results: { ...state.results, [id]: result }, index: state.index + 1 }, rng);
}

export function answerPlacement(state: PlacementState, ok: boolean, ms: number, rng: Rng): PlacementState {
  if (!state.current) return state;
  const good = ok && ms <= placementLimitMs(state.current.skillId);
  if (!good) return settle(state, 'missed', rng);
  if (state.stage === 0) {
    return { ...state, stage: 1, current: newProblem(state.queue[state.index] as string, rng) };
  }
  return settle(state, 'placed', rng);
}

export function skipPlacementSkill(state: PlacementState, rng: Rng): PlacementState {
  if (!state.current) return state;
  return settle(state, 'skipped', rng);
}

export function isPlacementDone(state: PlacementState): boolean {
  return state.current === null;
}

export function placedIds(state: PlacementState): string[] {
  return state.queue.filter((id) => state.results[id] === 'placed');
}

/** Marks placed skills as learned in box 3, so they show up as review, not new. */
export function applyPlacement(data: AppData, state: PlacementState, now: number): AppData {
  const skills = { ...data.skills };
  for (const id of placedIds(state)) {
    if (skills[id]) continue;
    const p: SkillProgress = { ...newProgress(now), box: 3, dueAt: now + BOX_INTERVAL_DAYS[2] * 86_400_000 };
    skills[id] = p;
  }
  return { ...data, skills };
}
