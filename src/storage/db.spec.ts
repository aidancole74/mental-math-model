import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, loadData, saveData, type KV } from './db';
import { emptyData, validate } from './schema';

function memoryKV(seed: Record<string, string> = {}): KV & { dump: () => Record<string, string> } {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    dump: () => Object.fromEntries(m),
  };
}

describe('storage', () => {
  it('starts empty when nothing is saved', () => {
    expect(loadData(memoryKV())).toEqual(emptyData());
  });

  it('round-trips saved data', () => {
    const kv = memoryKV();
    const data = { ...emptyData(), days: ['2026-11-12'] };
    data.skills.x11 = { learnedAt: 1, box: 3, dueAt: 2, recent: [], total: 5, correct: 4, fastestMs: 1200, lastAt: 3 };
    expect(saveData(kv, data)).toBe(true);
    expect(loadData(kv)).toEqual(data);
  });

  it('quarantines unreadable data instead of deleting it', () => {
    const kv = memoryKV({ [STORAGE_KEY]: '{not json' });
    expect(loadData(kv, 123)).toEqual(emptyData());
    expect(kv.dump()['qmm.corrupt.123']).toBe('{not json');
  });

  it('rejects blobs from another version or app', () => {
    expect(validate({ version: 99 })).toBeNull();
    expect(validate({ hello: 'world' })).toBeNull();
    expect(validate(null)).toBeNull();
  });

  it('drops malformed skill entries and repairs unknown settings', () => {
    const cleaned = validate({
      ...emptyData(),
      settings: { sessionKind: 'banana', theme: 'dark' },
      skills: { good: { learnedAt: 1, box: 2 }, bad: { box: 9 }, worse: 'x' },
    });
    expect(Object.keys(cleaned?.skills ?? {})).toEqual(['good']);
    expect(cleaned?.settings.sessionKind).toBe('count');
    expect(cleaned?.settings.theme).toBe('dark');
  });

  it('reports a failed write instead of throwing', () => {
    const kv: KV = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(saveData(kv, emptyData())).toBe(false);
  });
});
