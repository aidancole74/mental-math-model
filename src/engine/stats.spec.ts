import { describe, expect, it } from 'vitest';
import { emptyData } from '../storage/schema';
import { withAttempt, withLearned } from './progress';
import { makeProblem, getSkill } from '../skills/registry';
import {
  bestSessionAvg,
  categoryStats,
  currentRun,
  dueCount,
  greeting,
  longestRun,
  overallAccuracy,
  reviewPicks,
  skillBadge,
  weekStrip,
} from './stats';

const at = (y: number, m: number, d: number, h = 12): number => new Date(y, m - 1, d, h).getTime();

describe('weekStrip', () => {
  it('lists the last seven days, oldest first, ending today', () => {
    const w = weekStrip(['2026-11-19', '2026-11-16', '2026-11-01'], at(2026, 11, 19));
    expect(w.map((d) => d.key)).toEqual([
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
    ]);
    expect(w.map((d) => d.practised)).toEqual([false, false, false, true, false, false, true]);
    expect(w.filter((d) => d.isToday).map((d) => d.key)).toEqual(['2026-11-19']);
    expect(w[6]?.label).toBe('T'); // a Thursday
  });

  it('steps back across a month end and a DST change', () => {
    const w = weekStrip([], at(2026, 11, 3, 0));
    expect(w[0]?.key).toBe('2026-10-28');
    expect(new Set(w.map((d) => d.key)).size).toBe(7);
  });
});

describe('category and overall stats', () => {
  it('counts learned skills and accuracy per category', () => {
    let data = withLearned(withLearned(emptyData(), 'x11', 0), 'square-5', 0);
    const p = makeProblem(getSkill('x11'), 1, 1);
    data = withAttempt(data, { problem: p, ok: true, ms: 2000, hint: false, given: '1' }, 1000);
    data = withAttempt(data, { problem: p, ok: false, ms: 2000, hint: false, given: '1' }, 2000);
    const st = categoryStats(data, 'tricks');
    expect(st).toMatchObject({ learned: 2, mastered: 0, problems: 2, accuracy: 0.5 });
    expect(st.total).toBeGreaterThanOrEqual(4);
    expect(categoryStats(data, 'percent')).toMatchObject({ learned: 0, accuracy: null });
    expect(overallAccuracy(data)).toBe(0.5);
    expect(overallAccuracy(emptyData())).toBeNull();
    expect(dueCount(data, 3000)).toBe(1); // x11 was missed: due now. square-5 has never been practised.
  });

  it('labels skills by where they stand', () => {
    const data = withLearned(emptyData(), 'ltr-add', 0);
    expect(skillBadge(data, 'ltr-add')).toBe('learning');
    expect(skillBadge(data, 'ltr-sub')).toBe('ready');
    expect(skillBadge(data, 'complements')).toBe('locked');
  });

  it('finds the best earlier session average, ignoring short ones', () => {
    const data = {
      ...emptyData(),
      sessions: [
        { at: 1, n: 10, correct: 9, avgMs: 4000, skillIds: [] },
        { at: 2, n: 3, correct: 3, avgMs: 1000, skillIds: [] },
        { at: 3, n: 10, correct: 10, avgMs: 3500, skillIds: [] },
      ],
    };
    expect(bestSessionAvg(data)).toBe(3500);
    expect(bestSessionAvg(emptyData())).toBeNull();
  });
});

describe('runs of right answers', () => {
  it('finds the longest and the current run', () => {
    const oks = [true, true, false, true, true, true];
    expect(longestRun(oks)).toBe(3);
    expect(currentRun(oks)).toBe(3);
    expect(currentRun([true, false])).toBe(0);
    expect(longestRun([])).toBe(0);
  });
});

describe('greeting', () => {
  it('follows the local hour', () => {
    expect(greeting(at(2026, 1, 1, 8))).toBe('Good morning');
    expect(greeting(at(2026, 1, 1, 14))).toBe('Good afternoon');
    expect(greeting(at(2026, 1, 1, 21))).toBe('Good evening');
    expect(greeting(at(2026, 1, 1, 2))).toBe('Good evening');
  });
});

describe('reviewPicks', () => {
  it('puts due skills first, then the least mastered', () => {
    let data = emptyData();
    for (const id of ['x11', 'square-5', 'ltr-add']) data = withLearned(data, id, 0);
    data = {
      ...data,
      skills: {
        ...data.skills,
        x11: { ...data.skills.x11!, box: 4, dueAt: 10 },
        'square-5': { ...data.skills['square-5']!, box: 2, dueAt: 10_000 },
        'ltr-add': { ...data.skills['ltr-add']!, box: 5, dueAt: 10_000 },
      },
    };
    expect(reviewPicks(data, 100, 3)).toEqual(['x11', 'square-5', 'ltr-add']);
    expect(reviewPicks(data, 100, 1)).toEqual(['x11']);
    expect(reviewPicks(emptyData(), 100, 3)).toEqual([]);
  });
});
