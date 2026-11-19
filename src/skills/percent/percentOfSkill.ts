/**
 * Factory for the "p% of x" skills (1%, 20/25/50%, combining blocks).
 * Each supplies how to pick p and x per difficulty and its real-world
 * contexts; the factory does prompts, speech, answers and walkthroughs.
 *
 * meta: { p, x, ctx } — ctx indexes contexts(p), or -1 for a plain drill.
 */

import { defineSkill } from '../define';
import { metaNum, money, num } from '../helpers';
import type { Constraint, Difficulty, Lesson, Meta, Problem, ProblemSpec, Rng, Skill, Step } from '../types';
import { percentOf } from './blocks';
import { m, n, phrase } from './phrase';

export interface Context {
  /** Uses {x} / {x-} for the amount and {p} for the percent. */
  t: string;
  /** Closing line; {a} is the answer as money. */
  close: string;
}

export interface PercentOfConfig {
  id: string;
  title: string;
  blurb: string;
  order: number;
  prereqs: string[];
  lesson: Lesson;
  pick: (d: Difficulty, rng: Rng) => { p: number; x: number };
  contexts: (p: number) => Context[];
  /** Chance of a real-world context, per difficulty. */
  contextChance: [number, number, number];
  targetSeconds?: [number, number, number];
  constraints?: Constraint[];
}

export function percentOfSkill(cfg: PercentOfConfig): Skill {
  function generate(d: Difficulty, rng: Rng): ProblemSpec {
    const { p, x } = cfg.pick(d, rng);
    const { value } = percentOf(p, x);
    const options = cfg.contexts(p);
    if (options.length === 0 || !rng.chance(cfg.contextChance[d - 1] ?? 0)) {
      return {
        prompt: p + '% of ' + num(x),
        spoken: p + ' percent of ' + x,
        answer: value,
        answerKind: 'decimal',
        meta: { p, x, ctx: -1 },
      };
    }
    const ctx = rng.int(0, options.length - 1);
    const { prompt, spoken } = phrase((options[ctx] as Context).t, { x: m(x), p: n(p) });
    return { prompt, spoken, answer: value, answerKind: 'money', unit: '$', meta: { p, x, ctx } };
  }

  function solve(problem: Problem): Step[] {
    const p = metaNum(problem.meta, 'p');
    const x = metaNum(problem.meta, 'x');
    const ctx = metaNum(problem.meta, 'ctx');
    const steps = [...percentOf(p, x).steps];
    const context = ctx >= 0 ? cfg.contexts(p)[ctx] : undefined;
    if (context) steps.push({ text: context.close.replace('{a}', money(problem.answer)) });
    return steps;
  }

  const def: Parameters<typeof defineSkill>[0] = {
    id: cfg.id,
    title: cfg.title,
    blurb: cfg.blurb,
    category: 'percent',
    order: cfg.order,
    prereqs: cfg.prereqs,
    lesson: cfg.lesson,
    truth: (meta: Meta) => (metaNum(meta, 'p') * metaNum(meta, 'x')) / 100,
    generate,
    solve,
    hint: (problem) => percentOf(metaNum(problem.meta, 'p'), metaNum(problem.meta, 'x')).hint,
    constraints: [
      {
        name: 'context problems are about money',
        test: (p) => metaNum(p.meta, 'ctx') < 0 || (p.answerKind === 'money' && p.unit === '$'),
      },
      ...(cfg.constraints ?? []),
    ],
  };
  if (cfg.targetSeconds) def.targetSeconds = cfg.targetSeconds;
  return defineSkill(def);
}
