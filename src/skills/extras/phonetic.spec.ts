import { describe, expect, it } from 'vitest';
import { CODE, WORDS, decode } from './phonetic';

/** Spellings each sound can hide behind — catches typos in the word list. */
const SPELLINGS: Record<string, string[]> = {
  s: ['s', 'c'], z: ['z', 's'], t: ['t'], d: ['d'], n: ['n'], m: ['m'], r: ['r'], l: ['l'],
  j: ['j', 'g'], sh: ['sh', 'ch'], ch: ['ch'], k: ['k', 'c', 'q'], g: ['g'], f: ['f', 'ph'], v: ['v'], p: ['p'], b: ['b'],
};

const all = Object.values(WORDS).flat();

describe('phonetic code words', () => {
  it('decode to the number written down for them', () => {
    for (const e of all) expect(decode(e.sounds), e.word).toBe(e.n);
  });

  it('use only sounds the code knows, each with a letter in the word that makes it', () => {
    for (const e of all) {
      for (const s of e.sounds) {
        expect(CODE[s], e.word + ': ' + s).toBeDefined();
        expect(SPELLINGS[s]?.some((letters) => e.word.includes(letters)), e.word + ' has no spelling of ' + s).toBe(true);
      }
    }
  });

  it('are listed once each', () => {
    const words = all.map((e) => e.word);
    expect(new Set(words).size).toBe(words.length);
  });

  it('decode digits in order', () => {
    expect(decode(['n', 'f'])).toBe(28);
    expect(decode(['k', 'm', 'l'])).toBe(735);
    expect(() => decode(['x'])).toThrow();
  });
});
