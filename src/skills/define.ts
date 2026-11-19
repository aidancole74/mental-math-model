import type { Problem, Skill, SkillDef } from './types';

/**
 * Fills in the defaults a SkillDef may leave out.
 * Lives in its own module so skill files never import the registry
 * (which imports them) — no import cycle.
 */
export function defineSkill(def: SkillDef): Skill {
  const hint =
    def.hint ??
    ((problem: Problem): string => {
      const first = def.solve(problem)[0];
      if (!first) throw new Error('solve() returned no steps for ' + problem.id);
      return first.text;
    });
  return { ...def, answerMode: def.answerMode ?? 'exact', hint };
}
