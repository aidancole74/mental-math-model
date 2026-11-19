import { describe, expect, it } from 'vitest';
import { getSkill, makeProblem } from '../skills/registry';
import { createRng } from '../skills/rng';
import { emptyData, type AppData, type Attempt, type SkillProgress } from '../storage/schema';
import { nextToLearn, statusOf } from './curriculum';
import { formatAnswer, formatGiven, formatRange, isCorrect, parseAnswer } from './grading';
import { dayKey, withAttempt, withLearned } from './progress';
import {
  BOX_INTERVAL_DAYS,
  TARGET_MS,
  applyAttempt,
  difficultyFor,
  isMastered,
  mastery,
  newProgress,
  pickSkill,
  skillWeight,
} from './scheduler';
import { advance, answerCurrent, isOver, startSession, summarize, type AnswerRecord, type SessionConfig } from './session';

const DAY = 86_400_000;
const T0 = new Date(2026, 10, 12, 9, 0, 0).getTime();

const attempt = (over: Partial<Attempt> = {}): Attempt => ({ at: T0, ok: true, ms: 3000, d: 1, hint: false, ...over });

describe('grading', () => {
  it('parses keypad input, money and commas', () => {
    expect(parseAnswer('473')).toBe(473);
    expect(parseAnswer('9.6')).toBe(9.6);
    expect(parseAnswer('$1,234.50')).toBe(1234.5);
    expect(parseAnswer('.5')).toBe(0.5);
    expect(parseAnswer('')).toBeNull();
    expect(parseAnswer('.')).toBeNull();
    expect(parseAnswer('1.2.3')).toBeNull();
  });

  it('grades integers exactly and money to the cent', () => {
    const int = makeProblem(getSkill('x11'), 1, 1);
    expect(isCorrect(int, int.answer)).toBe(true);
    expect(isCorrect(int, int.answer + 1)).toBe(false);

    const pct = { ...makeProblem(getSkill('pct-basics'), 2, 1), answer: 9.6, answerKind: 'money' as const };
    expect(isCorrect(pct, 9.6)).toBe(true);
    expect(isCorrect(pct, 9.60)).toBe(true);
    expect(isCorrect(pct, 9.61)).toBe(false);
  });

  it('grades estimates within tolerance', () => {
    const p = { ...makeProblem(getSkill('x11'), 1, 1), answer: 100, tolerance: 10 };
    expect(isCorrect(p, 110)).toBe(true);
    expect(isCorrect(p, 90)).toBe(true);
    expect(isCorrect(p, 111)).toBe(false);
  });

  it('formats the expected answer for display', () => {
    const p = makeProblem(getSkill('square-5'), 3, 1);
    expect(formatAnswer({ ...p, answer: 13225 })).toBe('13,225');
    expect(formatAnswer({ ...p, answer: 9.6, answerKind: 'money', unit: '$' })).toBe('$9.60');
    expect(formatAnswer({ ...p, answer: 9.6, answerKind: 'decimal' })).toBe('9.6');
  });

  it('grades and formats 3-place decimals (fractions)', () => {
    const p = makeProblem(getSkill('frac-decimal'), 2, 1);
    const f = { ...p, answer: 0.375 };
    expect(p.decimals).toBe(3);
    expect(isCorrect(f, 0.375)).toBe(true);
    expect(isCorrect(f, 0.38)).toBe(false); // would pass at the default 2 places
    expect(isCorrect(f, 0.374)).toBe(false);
    expect(formatAnswer({ ...f, answer: 1.625 })).toBe('1.625');
  });

  it('grades choice answers by index and shows their labels', () => {
    const p = makeProblem(getSkill('day-of-week'), 1, 1);
    expect(p.answerKind).toBe('choice');
    expect(isCorrect(p, p.answer)).toBe(true);
    expect(isCorrect(p, (p.answer + 1) % 7)).toBe(false);
    expect(formatAnswer({ ...p, answer: 2 })).toBe('Tuesday');
    expect(formatGiven({ ...p, answer: 2 }, '5')).toBe('Friday');
    expect(formatRange(p)).toBeNull();
  });

  it('shows what was typed with the problem’s unit and suffix', () => {
    const p = makeProblem(getSkill('x11'), 1, 1);
    expect(formatGiven({ ...p, unit: '$' }, '9.5')).toBe('$9.5');
    expect(formatGiven({ ...p, suffix: '%' }, '48')).toBe('48%');
  });
});

describe('Leitner boxes', () => {
  it('promotes on a fast, correct, un-hinted answer and schedules the next review', () => {
    const p = applyAttempt(newProgress(T0), attempt());
    expect(p.box).toBe(2);
    expect(p.dueAt).toBe(T0 + BOX_INTERVAL_DAYS[2] * DAY);
  });

  it('promotes at most once until the skill is due again', () => {
    let p = newProgress(T0);
    for (let i = 0; i < 10; i++) p = applyAttempt(p, attempt({ at: T0 + i * 1000 }));
    expect(p.box).toBe(2);
  });

  it('does not promote slow answers or hinted answers', () => {
    expect(applyAttempt(newProgress(T0), attempt({ ms: TARGET_MS[1] + 1 })).box).toBe(1);
    expect(applyAttempt(newProgress(T0), attempt({ hint: true })).box).toBe(1);
  });

  it('drops one box on a miss and makes the skill due now — forgiving, not a reset', () => {
    const p: SkillProgress = { ...newProgress(T0), box: 4, dueAt: T0 + 5 * DAY };
    const after = applyAttempt(p, attempt({ ok: false, at: T0 + DAY }));
    expect(after.box).toBe(3);
    expect(after.dueAt).toBe(T0 + DAY);
  });

  it('never leaves box 1-5', () => {
    expect(applyAttempt(newProgress(T0), attempt({ ok: false })).box).toBe(1);
    const top: SkillProgress = { ...newProgress(T0), box: 5 };
    expect(applyAttempt(top, attempt()).box).toBe(5);
  });

  it('keeps a bounded recent history and a personal best', () => {
    let p = newProgress(T0);
    for (let i = 0; i < 30; i++) p = applyAttempt(p, attempt({ ms: 5000 - i * 10 }));
    expect(p.recent.length).toBe(12);
    expect(p.total).toBe(30);
    expect(p.fastestMs).toBe(5000 - 29 * 10);
  });

  it('serves harder problems from higher boxes', () => {
    const rng = createRng(1);
    const avg = (box: SkillProgress['box']): number => {
      const p = { ...newProgress(T0), box };
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += difficultyFor(p, rng);
      return sum / 1000;
    };
    expect(avg(1)).toBe(1);
    expect(avg(3)).toBeGreaterThan(avg(2));
    expect(avg(5)).toBeGreaterThan(avg(3));
  });

  it('calls a skill mastered only at box 4+ with high recent accuracy', () => {
    const solid: SkillProgress = { ...newProgress(T0), box: 4, recent: Array.from({ length: 10 }, () => attempt()) };
    expect(isMastered(solid)).toBe(true);
    expect(isMastered({ ...solid, box: 3 })).toBe(false);
    const shaky = { ...solid, recent: [...solid.recent.slice(0, 7), ...Array.from({ length: 3 }, () => attempt({ ok: false }))] };
    expect(isMastered(shaky)).toBe(false);
    expect(mastery(solid)).toBeGreaterThan(mastery(shaky));
  });
});

describe('smart mix', () => {
  const weak: SkillProgress = {
    ...newProgress(T0),
    box: 2,
    recent: [attempt({ ok: false }), attempt({ ok: false }), attempt(), attempt({ ok: false })],
  };
  const strong: SkillProgress = {
    ...newProgress(T0),
    box: 5,
    dueAt: T0 + 8 * DAY,
    recent: Array.from({ length: 10 }, () => attempt({ ms: 2000 })),
  };

  it('weights weak skills well above mastered ones', () => {
    expect(skillWeight(weak, T0)).toBeGreaterThan(4 * skillWeight(strong, T0));
  });

  it('serves weak skills more often, but still reviews strong ones', () => {
    const rng = createRng(3);
    const counts = { weak: 0, strong: 0 };
    for (let i = 0; i < 2000; i++) {
      const id = pickSkill(
        [
          { id: 'weak', progress: weak },
          { id: 'strong', progress: strong },
        ],
        T0,
        rng,
        [],
      ) as 'weak' | 'strong';
      counts[id]++;
    }
    expect(counts.weak).toBeGreaterThan(counts.strong * 3);
    expect(counts.strong).toBeGreaterThan(50); // random review keeps old skills alive
  });

  it('only draws from learned skills', () => {
    let data: AppData = emptyData();
    data = withLearned(data, 'x11', T0);
    data = withLearned(data, 'ltr-add', T0);
    const config: SessionConfig = { kind: 'count', count: 10, seconds: 120, focus: null, challenge: false };
    const rng = createRng(5);
    let s = startSession(data, config, T0, rng);
    const seen = new Set<string>([s.current.skillId]);
    for (let i = 0; i < 200; i++) {
      s = advance(s, data, T0, rng);
      seen.add(s.current.skillId);
    }
    expect(seen).toEqual(new Set(['x11', 'ltr-add']));
  });

  it('focus mode draws from one skill only', () => {
    const data = withLearned(withLearned(emptyData(), 'x11', T0), 'ltr-add', T0);
    const config: SessionConfig = { kind: 'count', count: 10, seconds: 120, focus: 'ltr-add', challenge: false };
    const rng = createRng(6);
    let s = startSession(data, config, T0, rng);
    for (let i = 0; i < 50; i++) {
      expect(s.current.skillId).toBe('ltr-add');
      s = advance(s, data, T0, rng);
    }
  });
});

describe('session flow', () => {
  const data = withLearned(withLearned(emptyData(), 'x11', T0), 'square-5', T0);
  const rec = (s: ReturnType<typeof startSession>, ok: boolean, ms = 3000): AnswerRecord => ({
    problemId: s.current.id,
    skillId: s.current.skillId,
    difficulty: s.current.difficulty,
    ok,
    ms,
    hint: false,
    given: ok ? String(s.current.answer) : '0',
  });

  it('ends a count session after N answers', () => {
    const config: SessionConfig = { kind: 'count', count: 10, seconds: 120, focus: null, challenge: false };
    const rng = createRng(7);
    let s = startSession(data, config, T0, rng);
    for (let i = 0; i < 9; i++) {
      s = answerCurrent(s, rec(s, true));
      expect(isOver(s, T0)).toBe(false);
      s = advance(s, data, T0, rng);
    }
    s = answerCurrent(s, rec(s, true));
    expect(isOver(s, T0)).toBe(true);
  });

  it('ends a timed session when the clock runs out', () => {
    const config: SessionConfig = { kind: 'time', count: 10, seconds: 120, focus: null, challenge: false };
    const s = startSession(data, config, T0, createRng(8));
    expect(isOver(s, T0 + 119_000)).toBe(false);
    expect(isOver(s, T0 + 120_000)).toBe(true);
  });

  it('brings a missed skill back a few problems later', () => {
    const config: SessionConfig = { kind: 'count', count: 10, seconds: 120, focus: null, challenge: false };
    const rng = createRng(9);
    let s = startSession(data, config, T0, rng);
    const missed = s.current.skillId;
    s = answerCurrent(s, rec(s, false));
    expect(s.retries).toHaveLength(1);
    const upcoming: string[] = [];
    for (let i = 0; i < 4; i++) {
      s = advance(s, data, T0, rng);
      upcoming.push(s.current.skillId);
      s = answerCurrent(s, rec(s, true));
    }
    expect(upcoming).toContain(missed);
    expect(s.retries).toHaveLength(0);
  });

  it('never repeats a problem in a session, even flipped (11 × 54 then 54 × 11)', () => {
    const config: SessionConfig = { kind: 'count', count: 10, seconds: 120, focus: 'x11', challenge: false };
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed);
      let s = startSession(data, config, T0, rng);
      for (let i = 0; i < 9; i++) s = advance(s, data, T0, rng);
      expect(new Set(s.servedKeys).size, 'seed ' + seed + ': ' + s.servedKeys.join(', ')).toBe(10);
    }
  });

  it('summarises accuracy, speed and the one skill to review', () => {
    const r = (skillId: string, ok: boolean, ms: number): AnswerRecord => ({
      problemId: skillId + ':1:1', skillId, difficulty: 1, ok, ms, hint: false, given: '1',
    });
    const s = summarize([r('x11', true, 2000), r('x11', true, 4000), r('square-5', false, 9000), r('square-5', true, 3000)]);
    expect(s.n).toBe(4);
    expect(s.correct).toBe(3);
    expect(s.accuracy).toBe(0.75);
    expect(s.avgMs).toBe(3000);
    expect(s.review).toEqual({ skillId: 'square-5', reason: 'Missed 1 of 2' });
  });

  it('picks the slowest skill to review when everything was right', () => {
    const r = (skillId: string, ms: number): AnswerRecord => ({
      problemId: skillId + ':1:1', skillId, difficulty: 1, ok: true, ms, hint: false, given: '1',
    });
    expect(summarize([r('x11', 2000), r('square-5', 8000)]).review).toEqual({
      skillId: 'square-5',
      reason: 'Your slowest this time',
    });
  });
});

describe('progress updates', () => {
  it('records an answer into the skill, the day list and the mistakes list', () => {
    let data = withLearned(emptyData(), 'x11', T0);
    const p = makeProblem(getSkill('x11'), 1, 42);
    data = withAttempt(data, { problem: p, ok: false, ms: 4000, hint: false, given: '999' }, T0);
    expect(data.skills.x11?.total).toBe(1);
    expect(data.days).toEqual([dayKey(T0)]);
    expect(data.mistakes).toEqual([{ problemId: p.id, skillId: 'x11', given: '999', at: T0 }]);

    data = withAttempt(data, { problem: p, ok: true, ms: 2000, hint: false, given: String(p.answer) }, T0 + 1000);
    expect(data.days).toHaveLength(1); // same day, not duplicated
  });

  it('does not mutate the input', () => {
    const data = withLearned(emptyData(), 'x11', T0);
    const snapshot = JSON.stringify(data);
    withAttempt(data, { problem: makeProblem(getSkill('x11'), 1, 1), ok: true, ms: 1, hint: false, given: '1' }, T0);
    expect(JSON.stringify(data)).toBe(snapshot);
  });
});

describe('curriculum', () => {
  it('unlocks skills by prerequisites and picks the next lesson in order', () => {
    let data = emptyData();
    expect(nextToLearn(data)?.id).toBe('x11');
    expect(statusOf(data, getSkill('ltr-sub'))).toBe('locked');
    data = withLearned(data, 'ltr-add', T0);
    expect(statusOf(data, getSkill('ltr-sub'))).toBe('available');
    expect(statusOf(data, getSkill('ltr-add'))).toBe('learned');
  });
});
