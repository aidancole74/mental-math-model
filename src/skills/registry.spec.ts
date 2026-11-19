import { describe, expect, it } from 'vitest';
import { SKILLS, getSkill, makeProblem, problemFromId } from './registry';
import { dec, money, num, round2 } from './helpers';
import type { Difficulty, Problem, Skill } from './types';

/**
 * The shared harness. Every registered skill is run through all of these,
 * so adding a new skill to the registry gives it this whole suite for free.
 */

const DIFFICULTIES: Difficulty[] = [1, 2, 3];
/** 500 by default; run `VITE_QMM_SEEDS=20000 npm test` for a deep stress pass. */
const SEEDS_PER_DIFFICULTY = Number(import.meta.env.VITE_QMM_SEEDS ?? 500);

function seeds(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

/** Every string form the answer might reasonably be written in. Choice answers: their label. */
function answerForms(p: Problem): string[] {
  const answer = p.answer;
  if (p.answerKind === 'choice') return [p.choices?.[answer] ?? '<missing choice>'];
  return Array.from(
    new Set([String(answer), String(round2(answer)), num(answer), dec(answer), money(answer)]),
  );
}

function mentionsAnswer(text: string, p: Problem): boolean {
  return answerForms(p).some((form) => text.includes(form));
}

/** Decimal places in a number as written: 0.375 -> 3. */
function placesOf(v: number): number {
  const text = String(v);
  return text.includes('.') ? (text.split('.')[1] ?? '').length : 0;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Stricter than mentionsAnswer: the answer must appear as a whole number, not
 * inside a bigger one ("24" in "240") and not as a percent label ("10" in "10%").
 * Used for the hint-leak check, where false alarms would be noise.
 */
function statesAnswer(text: string, p: Problem): boolean {
  return answerForms(p).some((form) =>
    new RegExp('(?<![\\d.,])' + escapeRegex(form) + '(?![\\d%]|[.,]\\d)').test(text),
  );
}

/** Characters a screen reader would mangle; `spoken` must spell these out. */
const UNSPEAKABLE = ['×', '÷', '²', '³', '√', '%', '$', '≈', '−'];

describe('registry integrity', () => {
  it('has at least one skill', () => {
    expect(SKILLS.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique order values', () => {
    const orders = SKILLS.map((s) => s.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('is sorted by order', () => {
    const orders = SKILLS.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('only lists prerequisites that exist and come earlier', () => {
    for (const skill of SKILLS) {
      for (const prereqId of skill.prereqs) {
        expect(() => getSkill(prereqId), skill.id + ' -> ' + prereqId).not.toThrow();
        expect(getSkill(prereqId).order, skill.id + ' -> ' + prereqId).toBeLessThan(skill.order);
      }
    }
  });

  it('has no prerequisite cycles', () => {
    const seen = new Map<string, boolean>();
    const visit = (id: string, stack: string[]): void => {
      if (stack.includes(id)) throw new Error('cycle: ' + [...stack, id].join(' -> '));
      if (seen.get(id)) return;
      for (const p of getSkill(id).prereqs) visit(p, [...stack, id]);
      seen.set(id, true);
    };
    for (const skill of SKILLS) expect(() => visit(skill.id, [])).not.toThrow();
  });
});

describe.each(SKILLS.map((s) => [s.id, s] as const))('skill: %s', (_id, skill: Skill) => {
  describe('metadata', () => {
    it('has a title and a blurb', () => {
      expect(skill.title.trim().length).toBeGreaterThan(0);
      expect(skill.blurb.trim().length).toBeGreaterThan(0);
    });
  });

  describe('lesson', () => {
    it('explains the idea', () => {
      expect(skill.lesson.idea.length).toBeGreaterThan(0);
      for (const para of skill.lesson.idea) expect(para.trim().length).toBeGreaterThan(20);
    });

    it('has a worked example with steps', () => {
      expect(skill.lesson.worked.prompt.trim().length).toBeGreaterThan(0);
      expect(skill.lesson.worked.steps.length).toBeGreaterThan(1);
      for (const step of skill.lesson.worked.steps) {
        expect(step.text.trim().length).toBeGreaterThan(0);
      }
    });

    it('has exactly 3 try-it problems that generate cleanly', () => {
      expect(skill.lesson.tryIt).toHaveLength(3);
      for (const ref of skill.lesson.tryIt) {
        const problem = makeProblem(skill, ref.difficulty, ref.seed);
        expect(Number.isFinite(problem.answer)).toBe(true);
        expect(skill.solve(problem).length).toBeGreaterThan(0);
        expect(skill.hint(problem).trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe.each(DIFFICULTIES)('difficulty %i', (difficulty) => {
    const problems: Problem[] = seeds(SEEDS_PER_DIFFICULTY).map((seed) =>
      makeProblem(skill, difficulty, seed),
    );

    it('generates answers that match an independent calculation', () => {
      for (const p of problems) {
        const expected = skill.truth(p.meta);
        expect(Math.abs(expected - p.answer), p.prompt + ' (seed ' + p.seed + ')').toBeLessThan(1e-9);
      }
    });

    it('generates finite answers of the declared kind', () => {
      for (const p of problems) {
        expect(Number.isFinite(p.answer), p.prompt).toBe(true);
        if (p.answerKind === 'integer') {
          expect(Number.isInteger(p.answer), p.prompt + ' should be a whole number').toBe(true);
        }
        if (p.answerKind === 'money') {
          expect(round2(p.answer), p.prompt + ' should be whole cents').toBe(p.answer);
        }
        // The keypad caps typing at this many places, so a longer answer could never be entered.
        expect(placesOf(p.answer), p.prompt + ' has more decimals than can be typed').toBeLessThanOrEqual(
          p.decimals ?? 2,
        );
      }
    });

    it('gives choice problems a valid set of options, and others none', () => {
      for (const p of problems) {
        if (p.answerKind === 'choice') {
          const choices = p.choices ?? [];
          expect(choices.length, p.prompt).toBeGreaterThanOrEqual(2);
          expect(new Set(choices).size, p.prompt + ' has duplicate choices').toBe(choices.length);
          expect(Number.isInteger(p.answer) && p.answer >= 0 && p.answer < choices.length, p.prompt).toBe(true);
        } else {
          expect(p.choices, p.prompt + ' has choices but is not a choice problem').toBeUndefined();
        }
      }
    });

    it('gives every problem a prompt and a speakable version', () => {
      for (const p of problems) {
        expect(p.prompt.trim().length, 'empty prompt').toBeGreaterThan(0);
        expect(p.spoken.trim().length, 'empty spoken').toBeGreaterThan(0);
        for (const ch of UNSPEAKABLE) {
          expect(p.spoken.includes(ch), 'spoken form contains "' + ch + '": ' + p.spoken).toBe(
            false,
          );
        }
      }
    });

    it('gives estimate problems a tolerance and exact problems none', () => {
      for (const p of problems) {
        if (skill.answerMode === 'estimate') {
          expect(p.tolerance, p.prompt).toBeGreaterThan(0);
        }
      }
    });

    it('walks through every problem and lands on the answer', () => {
      for (const p of problems) {
        const steps = skill.solve(p);
        expect(steps.length, 'no steps for ' + p.prompt).toBeGreaterThan(0);
        for (const step of steps) {
          expect(step.text.trim().length, 'empty step in ' + p.prompt).toBeGreaterThan(0);
        }
        const last = steps[steps.length - 1];
        expect(
          mentionsAnswer(last?.text ?? '', p),
          'last step of "' + p.prompt + '" should state ' + p.answer + ', got: ' + last?.text,
        ).toBe(true);
      }
    });

    it('hints with the first step only', () => {
      for (const p of problems) {
        const hint = skill.hint(p);
        expect(hint.trim().length, 'empty hint for ' + p.prompt).toBeGreaterThan(0);
        if (!skill.hintMayContainAnswer) {
          expect(
            statesAnswer(hint, p),
            'hint for "' + p.prompt + '" gives away ' + p.answer + ': ' + hint,
          ).toBe(false);
        }
      }
    });

    it('obeys its own constraints', () => {
      for (const constraint of skill.constraints ?? []) {
        for (const p of problems) {
          if (constraint.difficulty !== undefined && constraint.difficulty !== difficulty) continue;
          expect(constraint.test(p), constraint.name + ' failed on "' + p.prompt + '"').toBe(true);
        }
      }
    });

    it('is reproducible from its seed', () => {
      for (const p of problems.slice(0, 50)) {
        expect(makeProblem(skill, difficulty, p.seed)).toEqual(p);
        expect(problemFromId(p.id)).toEqual(p);
      }
    });

    it('actually varies with the seed', () => {
      const distinct = new Set(problems.map((p) => p.prompt));
      expect(distinct.size, 'generator barely varies').toBeGreaterThanOrEqual(3);
    });
  });
});
