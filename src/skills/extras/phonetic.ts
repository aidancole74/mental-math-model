import { defineSkill } from '../define';
import { metaNum, metaStr } from '../helpers';
import type { Difficulty, Meta, Problem, ProblemSpec, Step } from '../types';

/**
 * The phonetic number code (the "major system"): every digit is a consonant
 * sound, vowels and w, h, y are free. Practised by decoding words to numbers.
 * meta: { level, i } — index into that level's word list.
 */

export const CODE: Record<string, number> = {
  s: 0, z: 0,
  t: 1, d: 1,
  n: 2,
  m: 3,
  r: 4,
  l: 5,
  j: 6, sh: 6, ch: 6,
  k: 7, g: 7,
  f: 8, v: 8,
  p: 9, b: 9,
};

/** A word, its consonant SOUNDS (not letters), and its number written out by hand. */
export interface CodeWord {
  word: string;
  sounds: string[];
  n: number;
}

const w = (word: string, sounds: string, n: number): CodeWord => ({ word, sounds: sounds.split(' '), n });

/** Spelled the way they sound. */
const PLAIN: CodeWord[] = [
  w('toad', 't d', 11), w('tin', 't n', 12), w('tire', 't r', 14), w('tail', 't l', 15), w('duck', 'd k', 17),
  w('dove', 'd v', 18), w('tape', 't p', 19), w('net', 'n t', 21), w('nail', 'n l', 25), w('mat', 'm t', 31),
  w('moon', 'm n', 32), w('mom', 'm m', 33), w('mule', 'm l', 35), w('mug', 'm g', 37), w('map', 'm p', 39),
  w('rat', 'r t', 41), w('rain', 'r n', 42), w('ram', 'r m', 43), w('rail', 'r l', 45), w('rock', 'r k', 47),
  w('roof', 'r f', 48), w('rope', 'r p', 49), w('lime', 'l m', 53), w('lake', 'l k', 57), w('leaf', 'l f', 58),
  w('lip', 'l p', 59), w('jet', 'j t', 61), w('jar', 'j r', 64), w('jail', 'j l', 65), w('cat', 'k t', 71),
  w('cane', 'k n', 72), w('car', 'k r', 74), w('coal', 'k l', 75), w('cake', 'k k', 77), w('cave', 'k v', 78),
  w('cub', 'k b', 79), w('feet', 'f t', 81), w('fan', 'f n', 82), w('foam', 'f m', 83), w('fire', 'f r', 84),
  w('file', 'f l', 85), w('fig', 'f g', 87), w('bat', 'b t', 91), w('bone', 'b n', 92), w('bear', 'b r', 94),
  w('bell', 'b l', 95), w('book', 'b k', 97), w('beef', 'b f', 98),
];

/** Silent letters, soft sounds and spellings that trick the eye. */
const TRICKY: CodeWord[] = [
  w('knife', 'n f', 28), w('gnome', 'n m', 23), w('knob', 'n b', 29), w('tomb', 't m', 13), w('bomb', 'b m', 93),
  w('comb', 'k m', 73), w('lamb', 'l m', 53), w('light', 'l t', 51), w('notch', 'n ch', 26), w('match', 'm ch', 36),
  w('judge', 'j j', 66), w('chef', 'sh f', 68), w('cheese', 'ch z', 60), w('rose', 'r z', 40), w('nose', 'n z', 20),
  w('mouse', 'm s', 30), w('lace', 'l s', 50), w('face', 'f s', 80), w('case', 'k s', 70), w('bus', 'b s', 90),
  w('cage', 'k j', 76), w('gem', 'j m', 63), w('dish', 'd sh', 16), w('fish', 'f sh', 86), w('ship', 'sh p', 69),
  w('leash', 'l sh', 56), w('beach', 'b ch', 96), w('roach', 'r ch', 46), w('movie', 'm v', 38), w('baby', 'b b', 99),
  w('mower', 'm r', 34), w('rower', 'r r', 44), w('lily', 'l l', 55), w('lion', 'l n', 52), w('phone', 'f n', 82),
];

/** Three sounds. */
const LONG: CodeWord[] = [
  w('tunnel', 't n l', 125), w('camel', 'k m l', 735), w('rocket', 'r k t', 471), w('tomato', 't m t', 131),
  w('banana', 'b n n', 922), w('lemon', 'l m n', 532), w('cabin', 'k b n', 792), w('mitten', 'm t n', 312),
  w('button', 'b t n', 912), w('rabbit', 'r b t', 491), w('parrot', 'p r t', 941), w('pocket', 'p k t', 971),
  w('jacket', 'j k t', 671), w('ticket', 't k t', 171), w('needle', 'n d l', 215), w('puppet', 'p p t', 991),
  w('muffin', 'm f n', 382), w('robin', 'r b n', 492), w('kitten', 'k t n', 712), w('river', 'r v r', 484),
  w('ladder', 'l d r', 514), w('dinner', 'd n r', 124), w('tiger', 't g r', 174), w('giraffe', 'j r f', 648),
  w('chicken', 'ch k n', 672), w('machine', 'm sh n', 362), w('potato', 'p t t', 911), w('poodle', 'p d l', 915),
  w('nickel', 'n k l', 275), w('pickle', 'p k l', 975), w('tickle', 't k l', 175), w('shovel', 'sh v l', 685),
  w('locket', 'l k t', 571), w('radish', 'r d sh', 416), w('polish', 'p l sh', 956), w('relish', 'r l sh', 456),
  w('vanish', 'v n sh', 826), w('fossil', 'f s l', 805), w('tassel', 't s l', 105), w('locker', 'l k r', 574),
  w('poker', 'p k r', 974), w('joker', 'j k r', 674), w('cobra', 'k b r', 794), w('major', 'm j r', 364),
  w('rumor', 'r m r', 434), w('mirror', 'm r r', 344), w('kennel', 'k n l', 725), w('pupil', 'p p l', 995),
  w('puzzle', 'p z l', 905), w('mammal', 'm m l', 335), w('navel', 'n v l', 285), w('muzzle', 'm z l', 305),
  w('lagoon', 'l g n', 572), w('balloon', 'b l n', 952), w('baboon', 'b b n', 992), w('cannon', 'k n n', 722),
  w('tulip', 't l p', 159), w('cabbage', 'k b j', 796), w('cupid', 'k p d', 791), w('teacup', 't k p', 179),
  w('meteor', 'm t r', 314), w('motel', 'm t l', 315), w('lettuce', 'l t s', 510), w('chimney', 'ch m n', 632),
];

export const WORDS: Record<Difficulty, CodeWord[]> = { 1: PLAIN, 2: TRICKY, 3: LONG };

/** Decodes a list of sounds into a number, digit by digit. */
export function decode(sounds: string[]): number {
  return Number(
    sounds
      .map((s) => {
        const digit = CODE[s];
        if (digit === undefined) throw new Error('No digit for sound ' + s);
        return String(digit);
      })
      .join(''),
  );
}

function entry(meta: Meta): CodeWord {
  const list = WORDS[metaNum(meta, 'level') as Difficulty];
  const e = list[metaNum(meta, 'i')];
  if (!e) throw new Error('No code word at ' + String(meta.i));
  return e;
}

export const phoneticCode = defineSkill({
  id: 'phonetic-code',
  title: 'The phonetic number code',
  blurb: 'Words stand for numbers by their consonant sounds.',
  category: 'extras',
  order: 605,
  prereqs: [],
  targetSeconds: [6, 8, 12],
  truth: (meta: Meta) => entry(meta).n,
  lesson: {
    idea: [
      'Numbers are hard to remember; words are easy. This code gives each digit a consonant sound: 1 t/d, 2 n, 3 m, 4 r, 5 l, 6 j/sh/ch, 7 k/hard g, 8 f/v, 9 p/b, 0 s/z. Vowels and w, h, y count for nothing.',
      'Hooks to remember it: t has one downstroke, n two, m three; four ends in r; L is 50 in Roman numerals; j is a backwards 6; k is two 7s back to back; f in script loops like 8; p is a mirrored 9; z starts zero. Go by sound, not spelling.',
    ],
    worked: {
      prompt: 'What number is “knife”?',
      steps: [
        { text: 'The k is silent, so the sounds are n and f.' },
        { text: 'n = 2, f = 8.' },
        { text: '“knife” is 28.' },
        { text: 'Another: “camel” sounds k, m, l = 7, 3, 5 → 735.' },
      ],
    },
    tryIt: [
      { difficulty: 1, seed: 6051 },
      { difficulty: 1, seed: 6052 },
      { difficulty: 2, seed: 6053 },
    ],
  },
  generate: (difficulty: Difficulty, rng): ProblemSpec => {
    const list = WORDS[difficulty];
    const i = rng.int(0, list.length - 1);
    const e = list[i] as CodeWord;
    return {
      prompt: 'What number is “' + e.word + '”?',
      spoken: 'What number does the word ' + e.word + ' stand for?',
      answer: decode(e.sounds),
      answerKind: 'integer',
      meta: { level: difficulty, i, word: e.word },
    };
  },
  solve: (problem: Problem): Step[] => {
    const e = entry(problem.meta);
    const word = metaStr(problem.meta, 'word');
    return [
      {
        text: 'The consonant sounds in “' + word + '”: ' + e.sounds.join(', ') + '.',
        detail: 'Go by sound: silent letters and vowels count for nothing, and a doubled letter is one sound.',
      },
      { text: e.sounds.map((s) => s + ' = ' + CODE[s]).join(', ') + '.' },
      { text: 'So “' + word + '” is ' + problem.answer + '.' },
    ];
  },
  constraints: [
    { name: 'never starts with an s/z sound (no leading zero)', test: (p) => entry(p.meta).sounds[0] !== 's' && entry(p.meta).sounds[0] !== 'z' },
    { name: 'difficulty 3 words have three digits', difficulty: 3, test: (p) => p.answer >= 100 },
    { name: 'difficulty 1 and 2 words have two digits', test: (p) => p.difficulty === 3 || (p.answer >= 10 && p.answer <= 99) },
  ],
});
