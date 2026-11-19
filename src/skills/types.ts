/**
 * The skill contract.
 *
 * Every mental-math trick in the app is one object satisfying `SkillDef`.
 * Adding a trick later means adding one file and one line in registry.ts —
 * the lesson screen, the practice engine and the test harness all work off
 * this interface and need no changes.
 */

export type Difficulty = 1 | 2 | 3;

export type Category =
  | 'tricks'
  | 'addsub'
  | 'percent'
  | 'multiply'
  | 'divide'
  | 'estimate'
  | 'extras';

/** How the answer should be typed and graded. */
/** 'choice' = pick one of `choices`; the answer is that choice's index. */
export type AnswerKind = 'integer' | 'money' | 'decimal' | 'choice';

/** 'exact' = must match. 'estimate' = within the problem's tolerance. */
export type AnswerMode = 'exact' | 'estimate';

/** One line of a worked solution. `detail` is the optional "why" under it. */
export interface Step {
  text: string;
  detail?: string;
}

/** Numbers the generator chose, so solve()/hint() can rebuild the walkthrough. */
export type Meta = Record<string, number | string>;

/** What a generator returns, before the registry stamps on identity. */
export interface ProblemSpec {
  /** Shown on screen, e.g. "11 × 43" or "The bill is $64. What's a 15% tip?" */
  prompt: string;
  /** Read aloud by voice mode; spell out symbols, e.g. "11 times 43". */
  spoken: string;
  answer: number;
  answerKind: AnswerKind;
  /** The generator's chosen numbers. Keys are documented per skill. */
  meta: Meta;
  /** Absolute tolerance for 'estimate' problems. Ignored when exact. */
  tolerance?: number;
  /** Prefix shown on the answer display, e.g. '$'. */
  unit?: string;
  /** Suffix shown after the answer, e.g. '%' or ' years'. */
  suffix?: string;
  /**
   * Decimal places the answer is typed and graded to. Defaults to 2 (cents).
   * Fractions to decimals use 3 (3/8 = 0.375).
   */
  decimals?: number;
  /** For answerKind 'choice': the options, shown as buttons instead of the keypad. */
  choices?: string[];
}

/** A generated problem, uniquely addressable by (skillId, difficulty, seed). */
export interface Problem extends ProblemSpec {
  id: string;
  skillId: string;
  difficulty: Difficulty;
  seed: number;
}

/** A pointer to a problem the lesson will generate for its "try it" section. */
export interface TryItRef {
  difficulty: Difficulty;
  seed: number;
}

/** Two minutes or less, by design. */
export interface Lesson {
  /** The idea in a couple of short sentences. One string per paragraph. */
  idea: string[];
  /** One example, shown step by step. */
  worked: { prompt: string; steps: Step[] };
  /** Exactly 3 problems, generated from these seeds so they are always real. */
  tryIt: [TryItRef, TryItRef, TryItRef];
}

/**
 * A property that must hold for every generated problem. Checked for every
 * skill by the shared test harness. Use these to pin down the cases that make
 * a skill worth practising (e.g. "difficulty 2 of x11 always carries").
 */
export interface Constraint {
  name: string;
  /** Only checked at this difficulty when given; otherwise checked at all. */
  difficulty?: Difficulty;
  test: (problem: Problem) => boolean;
}

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive both ends. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Returns a new shuffled array. */
  shuffled<T>(items: readonly T[]): T[];
}

export interface SkillDef {
  id: string;
  title: string;
  /** One line, shown under the title in lists. */
  blurb: string;
  category: Category;
  /** Position within the whole curriculum; also the default unlock order. */
  order: number;
  /** Skill ids that must be learned first. */
  prereqs: string[];
  answerMode?: AnswerMode;
  /**
   * What counts as "fast" at difficulty 1, 2, 3, in seconds. Word problems
   * take longer to read than "11 × 43", so they get more time.
   * Defaults to 6 / 10 / 15.
   */
  targetSeconds?: [number, number, number];
  lesson: Lesson;

  /** Build a problem. Must only use `rng` for randomness, so it is replayable. */
  generate: (difficulty: Difficulty, rng: Rng) => ProblemSpec;

  /** Full walkthrough for ANY generated problem, rebuilt from problem.meta. */
  solve: (problem: Problem) => Step[];

  /** First step only. Defaults to solve(problem)[0].text. */
  hint?: (problem: Problem) => string;

  /**
   * The answer computed the most direct way possible (e.g. a * b), used only
   * by tests as an independent cross-check against the generator's own
   * trick-shaped arithmetic. Deliberate duplication: that is the point.
   */
  truth: (meta: Meta) => number;

  constraints?: Constraint[];

  /** Opt out of the "hint must not contain the answer" test. Rare. */
  hintMayContainAnswer?: boolean;
}

/** A registered skill: a SkillDef with defaults filled in. */
export interface Skill extends SkillDef {
  answerMode: AnswerMode;
  hint: (problem: Problem) => string;
}
