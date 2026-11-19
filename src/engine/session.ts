/**
 * A practice session as plain data plus pure transitions, so the whole flow
 * is unit-testable without a browser. The Session screen just renders this.
 */

import { getSkill, makeProblem } from '../skills/registry';
import type { Difficulty, Problem, Rng } from '../skills/types';
import type { AppData, SessionKind, SessionRecord } from '../storage/schema';
import { SESSION_COUNT, SESSION_SECONDS } from '../storage/schema';
import { learnedSkills } from './curriculum';
import { difficultyFor, newProgress, pickSkill, targetMsFor, type Candidate } from './scheduler';

export interface SessionConfig {
  kind: SessionKind;
  count: number;
  seconds: number;
  /** Practise one skill only; null = smart mix across learned skills. */
  focus: string | null;
  challenge: boolean;
}

export interface AnswerRecord {
  problemId: string;
  skillId: string;
  difficulty: Difficulty;
  ok: boolean;
  ms: number;
  hint: boolean;
  given: string | null;
}

interface Retry {
  skillId: string;
  difficulty: Difficulty;
  /** Serve once this many problems have been answered. */
  at: number;
}

export interface SessionState {
  config: SessionConfig;
  startedAt: number;
  current: Problem;
  results: AnswerRecord[];
  retries: Retry[];
  servedSkills: string[];
  servedIds: string[];
  /** skillId|answer for every problem served; stops "11 × 54" then "54 × 11". */
  servedKeys: string[];
}

/** Problems between a miss and its follow-up. */
export const RETRY_GAP = 3;

export function configFor(data: AppData, focus: string | null): SessionConfig {
  return {
    kind: data.settings.sessionKind,
    count: SESSION_COUNT,
    seconds: SESSION_SECONDS,
    focus,
    challenge: data.settings.challenge,
  };
}

function candidates(data: AppData, focus: string | null, now: number): Candidate[] {
  const ids = focus ? [focus] : learnedSkills(data).map((s) => s.id);
  return ids.map((id) => ({ id, progress: data.skills[id] ?? newProgress(now) }));
}

export function canStart(data: AppData, focus: string | null): boolean {
  return focus !== null || learnedSkills(data).length > 0;
}

/**
 * Two problems count as the same if they share a skill and an answer.
 * Choice problems have only a handful of answers (7 weekdays), so for them
 * only the same question counts.
 */
export function sameness(p: Problem): string {
  return p.skillId + '|' + (p.answerKind === 'choice' ? p.prompt : p.answer);
}

/** Fresh draws to try before accepting a repeat (tiny pools can run dry). */
const DEDUPE_TRIES = 12;

function choose(
  data: AppData,
  config: SessionConfig,
  servedSkills: string[],
  servedKeys: string[],
  retries: Retry[],
  answered: number,
  now: number,
  rng: Rng,
): { problem: Problem; retries: Retry[] } {
  const dueRetry = retries.find((r) => r.at <= answered);
  let skillId: string;
  let difficulty: Difficulty;
  let remaining = retries;

  if (dueRetry) {
    skillId = dueRetry.skillId;
    difficulty = dueRetry.difficulty;
    remaining = retries.filter((r) => r !== dueRetry);
  } else {
    const pool = candidates(data, config.focus, now);
    skillId = pickSkill(pool, now, rng, servedSkills);
    difficulty = difficultyFor(data.skills[skillId] ?? newProgress(now), rng);
  }

  const skill = getSkill(skillId);
  // Avoid repeating a problem within one session.
  let problem = makeProblem(skill, difficulty, rng.int(1, 2 ** 31 - 1));
  for (let i = 0; i < DEDUPE_TRIES && servedKeys.includes(sameness(problem)); i++) {
    problem = makeProblem(skill, difficulty, rng.int(1, 2 ** 31 - 1));
  }
  return { problem, retries: remaining };
}

export function startSession(data: AppData, config: SessionConfig, now: number, rng: Rng): SessionState {
  const { problem, retries } = choose(data, config, [], [], [], 0, now, rng);
  return {
    config,
    startedAt: now,
    current: problem,
    results: [],
    retries,
    servedSkills: [problem.skillId],
    servedIds: [problem.id],
    servedKeys: [sameness(problem)],
  };
}

/** Records the answer to the current problem. A miss schedules a follow-up. */
export function answerCurrent(state: SessionState, record: AnswerRecord): SessionState {
  const results = [...state.results, record];
  const retries = record.ok
    ? state.retries
    : [...state.retries, { skillId: record.skillId, difficulty: record.difficulty, at: results.length + RETRY_GAP - 1 }];
  return { ...state, results, retries };
}

/** True once the session should end. Checked between problems only. */
export function isOver(state: SessionState, now: number): boolean {
  if (state.config.kind === 'count') return state.results.length >= state.config.count;
  return now - state.startedAt >= state.config.seconds * 1000;
}

export function advance(state: SessionState, data: AppData, now: number, rng: Rng): SessionState {
  const { problem, retries } = choose(
    data,
    state.config,
    state.servedSkills,
    state.servedKeys,
    state.retries,
    state.results.length,
    now,
    rng,
  );
  return {
    ...state,
    current: problem,
    retries,
    servedSkills: [...state.servedSkills, problem.skillId],
    servedIds: [...state.servedIds, problem.id],
    servedKeys: [...state.servedKeys, sameness(problem)],
  };
}

/** Seconds left in a timed session (0 when over). Count sessions return null. */
export function secondsLeft(state: SessionState, now: number): number | null {
  if (state.config.kind !== 'time') return null;
  return Math.max(0, Math.ceil((state.config.seconds * 1000 - (now - state.startedAt)) / 1000));
}

/** Per-problem countdown for challenge mode: 1.5× the target time. */
export function challengeLimitMs(problem: Problem): number {
  return targetMsFor(getSkill(problem.skillId), problem.difficulty) * 1.5;
}

export interface Summary {
  n: number;
  correct: number;
  accuracy: number;
  /** Mean time of correct answers, null if none. */
  avgMs: number | null;
  /** The one skill to look at next, and why. Null if nothing was answered. */
  review: { skillId: string; reason: string } | null;
}

export function summarize(results: AnswerRecord[]): Summary {
  const n = results.length;
  const correct = results.filter((r) => r.ok).length;
  const okTimes = results.filter((r) => r.ok).map((r) => r.ms);
  const avgMs = okTimes.length ? okTimes.reduce((a, b) => a + b, 0) / okTimes.length : null;

  const bySkill = new Map<string, AnswerRecord[]>();
  for (const r of results) bySkill.set(r.skillId, [...(bySkill.get(r.skillId) ?? []), r]);

  let review: Summary['review'] = null;
  let worst = -Infinity;
  for (const [skillId, rs] of bySkill) {
    const misses = rs.filter((r) => !r.ok).length;
    const okOnes = rs.filter((r) => r.ok);
    const slowness = okOnes.length
      ? okOnes.reduce((a, r) => a + r.ms / targetMsFor(getSkill(r.skillId), r.difficulty), 0) / okOnes.length
      : 0;
    // Misses dominate; speed breaks ties and decides when everything was right.
    const score = (misses / rs.length) * 100 + slowness;
    if (score > worst) {
      worst = score;
      review = {
        skillId,
        reason: misses > 0 ? 'Missed ' + misses + ' of ' + rs.length : 'Your slowest this time',
      };
    }
  }
  return { n, correct, accuracy: n ? correct / n : 0, avgMs, review };
}

export function toRecord(state: SessionState, summary: Summary): SessionRecord {
  return {
    at: state.startedAt,
    n: summary.n,
    correct: summary.correct,
    avgMs: summary.avgMs,
    skillIds: Array.from(new Set(state.results.map((r) => r.skillId))),
  };
}
