import { SKILLS } from '../skills/registry';
import type { Skill } from '../skills/types';
import type { AppData } from '../storage/schema';

export type SkillStatus = 'learned' | 'available' | 'locked';

export function isLearned(data: AppData, id: string): boolean {
  return id in data.skills;
}

export function statusOf(data: AppData, skill: Skill): SkillStatus {
  if (isLearned(data, skill.id)) return 'learned';
  return skill.prereqs.every((p) => isLearned(data, p)) ? 'available' : 'locked';
}

/** The next lesson in curriculum order, or null when everything is learned. */
export function nextToLearn(data: AppData): Skill | null {
  return SKILLS.find((s) => statusOf(data, s) === 'available') ?? null;
}

/** Skills practice may draw from: learned ones only. */
export function learnedSkills(data: AppData): Skill[] {
  return SKILLS.filter((s) => isLearned(data, s.id));
}
