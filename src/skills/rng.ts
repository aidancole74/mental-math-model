import type { Rng } from './types';

/**
 * mulberry32 — a small, fast, well-distributed 32-bit PRNG.
 * Seeded so that every problem is reproducible from (skillId, difficulty, seed):
 * tests are deterministic, and a missed problem can be re-served exactly.
 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (max < min) throw new Error(`rng.int: max (${max}) < min (${min})`);
    return min + Math.floor(next() * (max - min + 1));
  };

  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('rng.pick: empty list');
      return items[int(0, items.length - 1)] as T;
    },
    chance: (p: number) => next() < p,
    shuffled<T>(items: readonly T[]): T[] {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        const tmp = out[i] as T;
        out[i] = out[j] as T;
        out[j] = tmp;
      }
      return out;
    },
  };
}

/** A fresh seed for live play (tests pass their own). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
