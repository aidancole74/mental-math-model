import { describe, expect, it } from 'vitest';
import { SKILLS } from '../skills/registry';
import { createRng } from '../skills/rng';
import { fromBackup, toBackup, backupFilename } from '../storage/backup';
import { emptyData } from '../storage/schema';
import {
  answerPlacement,
  applyPlacement,
  isPlacementDone,
  placedIds,
  placementLimitMs,
  skipPlacementSkill,
  startPlacement,
  PLACEMENT_LIMIT_MS,
} from './placement';
import { withLearned } from './progress';
import { computeStreak, streakMessage } from './streak';

describe('forgiving streak', () => {
  const today = '2026-11-13';

  it('is zero with no practice', () => {
    expect(computeStreak([], today)).toEqual({ current: 0, best: 0, state: 'none' });
  });

  it('counts consecutive days', () => {
    expect(computeStreak(['2026-11-11', '2026-11-12', '2026-11-13'], today)).toEqual({
      current: 3,
      best: 3,
      state: 'done-today',
    });
  });

  it('forgives a single missed day', () => {
    // Mon, (skip Tue), Wed, Thu
    const s = computeStreak(['2026-11-09', '2026-11-11', '2026-11-12'], '2026-11-12');
    expect(s.current).toBe(3);
  });

  it('breaks after two missed days in a row, but remembers the best', () => {
    const s = computeStreak(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-06'], '2026-11-06');
    expect(s.current).toBe(1);
    expect(s.best).toBe(3);
  });

  it('stays alive (open) when the last practice was yesterday', () => {
    const s = computeStreak(['2026-11-11', '2026-11-12'], today);
    expect(s).toEqual({ current: 2, best: 2, state: 'open' });
  });

  it('enters grace when yesterday was missed, and ends the day after', () => {
    expect(computeStreak(['2026-11-10', '2026-11-11'], today).state).toBe('grace');
    expect(computeStreak(['2026-11-10', '2026-11-11'], today).current).toBe(2);
    expect(computeStreak(['2026-11-10', '2026-11-11'], '2026-11-14')).toEqual({ current: 0, best: 2, state: 'none' });
  });

  it('crosses month and year boundaries and a DST change', () => {
    expect(computeStreak(['2026-12-31', '2027-01-01'], '2027-01-01').current).toBe(2);
    expect(computeStreak(['2026-03-07', '2026-03-08', '2026-03-09'], '2026-03-09').current).toBe(3);
  });

  it('never scolds', () => {
    for (const state of ['done-today', 'open', 'grace', 'none'] as const) {
      expect(streakMessage({ current: 3, best: 5, state })).not.toMatch(/lost|fail|broke/i);
    }
  });
});

describe('placement quiz', () => {
  const fast = PLACEMENT_LIMIT_MS - 1;

  it('starts at the first unlearned skill and skips learned ones', () => {
    const data = withLearned(emptyData(), 'x11', 0);
    const s = startPlacement(data, createRng(1));
    expect(s.queue).not.toContain('x11');
    expect(s.current?.skillId).toBe(s.queue[0]);
    expect(s.current?.difficulty).toBe(2);
  });

  it('places a skill after two quick right answers', () => {
    const rng = createRng(2);
    let s = startPlacement(emptyData(), rng);
    const first = s.current?.skillId;
    s = answerPlacement(s, true, fast, rng);
    expect(s.current?.skillId).toBe(first); // confirming problem, same skill
    s = answerPlacement(s, true, fast, rng);
    expect(s.results[first as string]).toBe('placed');
    expect(s.current?.skillId).not.toBe(first);
  });

  it('does not place on a right but slow answer', () => {
    const rng = createRng(3);
    let s = startPlacement(emptyData(), rng);
    const first = s.current?.skillId as string;
    s = answerPlacement(s, true, PLACEMENT_LIMIT_MS + 1, rng);
    expect(s.results[first]).toBe('missed');
  });

  it('gives up on a category after two misses in a row', () => {
    const rng = createRng(4);
    let s = startPlacement(emptyData(), rng);
    // tricks: x11, square-5, x9-x5-x25 — miss the first two
    s = answerPlacement(s, false, fast, rng);
    s = answerPlacement(s, false, fast, rng);
    expect(s.results['x9-x5-x25']).toBe('skipped');
    expect(s.current?.skillId).toBe('ltr-add');
  });

  it('skips skills whose prerequisites were not placed', () => {
    const rng = createRng(5);
    let s = startPlacement(emptyData(), rng);
    while (s.current && s.current.skillId !== 'ltr-add') s = skipPlacementSkill(s, rng);
    s = answerPlacement(s, false, fast, rng); // miss ltr-add
    expect(s.results['ltr-sub']).toBe('skipped'); // needs ltr-add
  });

  it('finishes, and applies placed skills as learned in box 3', () => {
    const rng = createRng(6);
    let s = startPlacement(emptyData(), rng);
    let guard = 0;
    // Just inside each skill's own time limit (some skills are given less time than the default).
    while (!isPlacementDone(s) && guard++ < 200) {
      s = answerPlacement(s, true, placementLimitMs(s.current?.skillId ?? '') - 1, rng);
    }
    expect(isPlacementDone(s)).toBe(true);
    expect(placedIds(s).sort()).toEqual(SKILLS.map((k) => k.id).sort());
    const data = applyPlacement(emptyData(), s, 1000);
    expect(Object.keys(data.skills).length).toBe(SKILLS.length);
    expect(Object.values(data.skills).every((p) => p.box === 3)).toBe(true);
  });

  it('never overwrites progress on an already-learned skill', () => {
    const data = withLearned(emptyData(), 'x11', 0);
    const before = data.skills.x11;
    const rng = createRng(7);
    let s = startPlacement(data, rng);
    while (!isPlacementDone(s)) s = answerPlacement(s, true, fast, rng);
    expect(applyPlacement(data, s, 5).skills.x11).toBe(before);
  });
});

describe('backup', () => {
  it('round-trips data through a backup file', () => {
    const data = withLearned({ ...emptyData(), days: ['2026-11-13'] }, 'x11', 123);
    const parsed = fromBackup(toBackup(data, Date.UTC(2026, 10, 13)));
    expect(parsed).toEqual({ ok: true, data, exportedAt: '2026-11-13T00:00:00.000Z' });
  });

  it('accepts a bare data blob too', () => {
    const data = emptyData();
    expect(fromBackup(JSON.stringify(data))).toMatchObject({ ok: true, data });
  });

  it('rejects junk with a readable message, without throwing', () => {
    expect(fromBackup('not json')).toMatchObject({ ok: false });
    expect(fromBackup('{"hello":1}')).toMatchObject({ ok: false });
    expect(fromBackup('{"app":"quick-mental-math","data":{"version":9}}')).toMatchObject({ ok: false });
  });

  it('names files by date', () => {
    expect(backupFilename(Date.UTC(2026, 10, 13, 12))).toBe('quick-mental-math-backup-2026-11-13.json');
  });
});
