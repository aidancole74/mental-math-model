import type { Difficulty, Problem, Skill } from './types';
import { createRng, randomSeed } from './rng';

import { x11 } from './tricks/x11';
import { square5 } from './tricks/square5';
import { friendly } from './tricks/friendly';
import { ltrAdd } from './addsub/ltrAdd';
import { ltrSub } from './addsub/ltrSub';
import { pctBasics } from './percent/pctBasics';
import { pct1, pctCombine, pctFlip, pctQuarters } from './percent/pctBlockSkills';
import { pctDiscount, pctSplit, pctTax, pctTips } from './percent/pctMoneySkills';
import { pctChange, pctWhat, pctWhole } from './percent/pctReverseSkills';
import { pctEstimate, pctRule72 } from './percent/pctEstimateSkills';
import { x4x8 } from './tricks/x4x8';
import { complements } from './addsub/complements';
import { closePairs, square2d, square3d } from './multiply/squares';
import { mult2x1, mult2x2, mult2x3 } from './multiply/products';
import { divide1d } from './divide/divide1d';
import { divisibility } from './divide/divisibility';
import { fracDecimal } from './divide/fracDecimal';
import { estProduct, estQuotient, estRound, estSqrt } from './estimate/estimates';
import { dayOfWeek } from './extras/dayOfWeek';
import { phoneticCode } from './extras/phonetic';

export { defineSkill } from './define';

/**
 * Every skill in the app, in curriculum order.
 * Adding a trick = add the file, add it here. Nothing else changes.
 */
export const SKILLS: Skill[] = [
  // quick tricks
  x11,
  square5,
  friendly,
  x4x8,
  // adding & subtracting
  ltrAdd,
  ltrSub,
  complements,
  // percentages
  pctBasics,
  pct1,
  pctQuarters,
  pctCombine,
  pctFlip,
  pctTips,
  pctSplit,
  pctDiscount,
  pctTax,
  pctWhole,
  pctWhat,
  pctChange,
  pctEstimate,
  pctRule72,
  // multiplication
  square2d,
  closePairs,
  mult2x1,
  mult2x2,
  square3d,
  mult2x3,
  // division & fractions
  divide1d,
  divisibility,
  fracDecimal,
  // estimation
  estRound,
  estProduct,
  estQuotient,
  estSqrt,
  // fun extras
  dayOfWeek,
  phoneticCode,
].sort(
  (a, b) => a.order - b.order,
);

const BY_ID = new Map<string, Skill>(SKILLS.map((s) => [s.id, s]));

export function getSkill(id: string): Skill {
  const skill = BY_ID.get(id);
  if (!skill) throw new Error('Unknown skill id: ' + id);
  return skill;
}

export function hasSkill(id: string): boolean {
  return BY_ID.has(id);
}

export function skillsInCategory(category: Skill['category']): Skill[] {
  return SKILLS.filter((s) => s.category === category);
}

/** Builds a problem. Reproducible: same (skill, difficulty, seed) -> same problem. */
export function makeProblem(skill: Skill, difficulty: Difficulty, seed: number): Problem {
  const spec = skill.generate(difficulty, createRng(seed));
  return {
    ...spec,
    id: skill.id + ':' + difficulty + ':' + seed,
    skillId: skill.id,
    difficulty,
    seed,
  };
}

/** A fresh random problem for live play. */
export function nextProblem(skill: Skill, difficulty: Difficulty): Problem {
  return makeProblem(skill, difficulty, randomSeed());
}

/** Rebuilds the exact problem behind an id, for "show me how" and the mistakes list. */
export function problemFromId(id: string): Problem {
  const parts = id.split(':');
  if (parts.length !== 3) throw new Error('Malformed problem id: ' + id);
  const [skillId, difficulty, seed] = parts as [string, string, string];
  const d = Number(difficulty);
  if (d !== 1 && d !== 2 && d !== 3) throw new Error('Bad difficulty in id: ' + id);
  return makeProblem(getSkill(skillId), d, Number(seed));
}
