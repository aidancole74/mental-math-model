# Quick Mental Math — handoff notes

Read this first, then `BRIEF.md` (the owner's original requirements, verbatim).

## Status

**Build steps 1–5 of 7 are done.** Next up: **step 6 (remaining curriculum)**, then step 7 (voice mode).

At handoff: **697 tests passing** (13 files), `tsc -b` clean, `npm run build` clean, all features driven
end-to-end in headless Chromium at phone size (390×844) with no console errors. A 20,000-seeds-per-level
stress run (~1.1M generated problems) passed.

| Step | What | State |
|---|---|---|
| 1 | Vite/React/TS setup, skill contract, seeded RNG, registry, shared test harness | ✅ |
| 2 | First 6 skills (x11, ends-in-5 squares, ×9/×5/×25, LTR add, LTR sub, 10/5/15%) | ✅ |
| 3 | Lesson screen, practice session + number pad, localStorage, Leitner smart mix, summary | ✅ |
| 4 | Progress screen (streak, chart, bests, mastery), mistakes review, placement quiz, backup, PWA/offline, dark mode | ✅ |
| 5 | Percentages track — 14 skills total, exact + "estimate within 10%" | ✅ |
| 6 | Remaining curriculum | ⏭ next |
| 7 | Voice mode | pending |

## Working agreement with the owner

- Work one build step at a time. **After each step: stop, say how to run it and exactly what to test, and wait for "go ahead".**
- All lesson text, examples and explanations in **our own words**. The Benjamin PDF was never provided; if
  `secrets-of-mental-math.pdf` appears in the project, use it only to check technique order.
- Simplicity first: one obvious action per screen, primary action at the bottom (thumb reach), no popups
  (confirmations are inline), large tap targets, one-handed use.
- Minimal dependencies (runtime deps are only `react` and `react-dom`).
- There is **no git repo yet**. Don't commit/push unless the owner asks; if they give a GitHub repo, push there.
- Report honestly: if a test fails, say so; verify UI changes by actually driving the app and looking at screenshots.

## Run it

```bash
npm install
npm test                                  # 697 tests, ~3s
VITE_QMM_SEEDS=20000 npm test             # deep stress pass of every generator (~90s)
npm run dev                               # dev server (no service worker)
npm run build && npx vite preview         # production build: needed to test PWA/offline
```

Toolchain at handoff: Node 22, TypeScript 7 (native), Vite 8, Vitest 5, React 19, vite-plugin-pwa 2.
`npm audit` reports 6 advisories, all inside vite-plugin-pwa's build-time workbox deps (dev only, nothing
ships to the browser). They were deliberately left alone; the only offered fix downgrades the plugin.

## Architecture

```
src/
  skills/                 ← the curriculum. Pure TS, no React.
    types.ts              ← THE CONTRACT: SkillDef, Problem, ProblemSpec, Step, Lesson, Constraint
    define.ts             ← defineSkill(): fills defaults (hint = first solve step, answerMode = exact)
    registry.ts           ← SKILLS list (add new skills here), makeProblem, problemFromId, getSkill
    rng.ts                ← seeded mulberry32 RNG
    helpers.ts            ← num, money, dec, round2, spokenMoney, spokenMoneyAdj, metaNum ...
    registry.spec.ts      ← SHARED HARNESS — every registered skill is tested automatically
    tricks/ addsub/ percent/   ← one file (or a few grouped) per skill, with *.spec.ts for exhaustive checks
  engine/                 ← pure logic, unit-tested
    grading.ts            ← parseAnswer, isCorrect (tolerance / integer / to-the-cent), formatAnswer, formatRange
    scheduler.ts          ← Leitner boxes, targetMsFor, mastery, smart-mix weights, pickSkill
    session.ts            ← session state machine (start/answer/advance/isOver/summarize), dedupe, retries
    curriculum.ts         ← learned / available / locked, nextToLearn
    progress.ts           ← pure AppData updates (withAttempt, withLearned, withSession, ...)
    streak.ts             ← forgiving streak
    placement.ts          ← placement quiz state machine
  storage/
    schema.ts             ← AppData v1 + validate() (repairs/rejects bad data)
    db.ts                 ← localStorage load/save; unreadable data is quarantined, never deleted
    store.ts              ← in-memory store + useData() (useSyncExternalStore), lastSummary
    backup.ts             ← export/import JSON envelope; iOS standalone uses the share sheet
  ui/                     ← ProblemSolver (the core answer UI), NumberPad, SpeedChart, bits, theme.css
  screens/                ← Home, Lesson, Session, Summary, Skills, SkillDetail, Settings,
                            Progress, Mistakes (+ retry), Placement, NotFound
  router.ts               ← tiny hash router (#/learn/x11, #/practice[/skillId], #/progress ...)
  voice/                  ← EMPTY — reserved for step 7
public/                   ← favicon.svg, apple-touch-icon.png, icons/ (192, 512, maskable-512)
vite.config.ts            ← base './', VitePWA (autoUpdate, precache all assets), vitest config
```

### The skill contract (read `src/skills/types.ts`)

A skill is one `defineSkill({...})` object:
- `id`, `title`, `blurb`, `category`, `order` (unique, curriculum position), `prereqs` (ids, must have lower order)
- `lesson`: `idea` (1–2 short paragraphs), `worked` ({prompt, steps}), `tryIt` (exactly 3 `{difficulty, seed}` refs)
- `generate(difficulty, rng) → ProblemSpec` — use ONLY `rng` for randomness (problems are replayable from `skillId:difficulty:seed`)
- `solve(problem) → Step[]` — rebuilds the walkthrough from `problem.meta`; **last step must state the answer**
- `hint?(problem)` — defaults to step 1; must not state the answer
- `truth(meta)` — the answer computed the most direct way (e.g. `a * b`). Tests cross-check it against the
  generator, which should compute the answer *the trick way*. The duplication is deliberate.
- `constraints?` — properties every generated problem must satisfy (e.g. "difficulty 2 of x11 always carries")
- optional: `answerMode: 'estimate'`, `targetSeconds: [d1, d2, d3]` (what counts as "fast"), `hintMayContainAnswer`

`ProblemSpec`: `prompt`, `spoken` (TTS-friendly, **no symbols** × ÷ ² % $ ≈ −), `answer`, `answerKind`
(`integer` | `money` | `decimal`), `meta`, optional `tolerance` (estimate problems), `unit` (prefix, '$'),
`suffix` ('%', ' years').

### What the shared harness enforces for every skill (`registry.spec.ts`)

500 seeds × 3 difficulties per skill (configurable with `VITE_QMM_SEEDS`):
answer == `truth(meta)` · finite and of the declared kind (money = whole cents) · prompt and speakable
`spoken` · estimate-mode skills always have a tolerance · walkthrough non-empty and its last step states the
answer · hint never states the answer (whole-number match, ignoring "N%" labels) · all `constraints` hold ·
reproducible from seed and from id · actually varies with the seed. Plus registry integrity: unique ids and
orders, prereqs exist and come earlier, no cycles, lesson shape (3 try-its that generate cleanly).

## Conventions that matter

- **Prompts with numbers and money**: build them with `phrase()` from `skills/percent/phrase.ts`:
  `phrase('{An:x} {x-} jacket is {p}% off.', { x: m(84), p: n(30) })` →
  "A $84 jacket…" / spoken "A 84-dollar jacket is 30 percent off." `{x}` = noun form, `{x-}` = adjective form
  ("90-dollar"), `{an:x}` / `{An:x}` = automatic a/an ("an 18% tip", "an $841 coat"). Use `{an:...}`, never
  `{a:...}` (`a` is a real slot name in pct-change). Amounts with cents read badly as adjectives — phrase them
  as nouns ("a bill of $83.47").
- **Estimate problems**: prompt starts with "About", has `tolerance = tenPercent(answer)`; walkthrough rounds
  to friendly numbers and ends with `exactLine(answer, tolerance, fmt)`; store the walkthrough's own estimate in
  `meta.est` and add the "estimate lands within 10%" constraint. UI shows a badge and the accepted range.
- **Avoid giveaways**: reject generated problems where the answer equals a number already shown in the
  question or hint (e.g. `844 − 444`, `76 − 38 = 38`, "what percent of 40 is 16" = 40%). See `isDull` in
  `ltrSub.ts` and `looksLikeAnswer` in `percent/estimatePct.ts`. The 20k stress run finds these.
- **Shared percent engine**: `percentOf(p, x)` in `percent/blocks.ts` builds any p% (plans for 1–12, 15, 18,
  20, 25, 30–95 step 5) from 10/5/1/50/25/20% blocks and returns `{value, steps, hint}`.
- Generators compute answers the trick way; round money with `round2`. Truth functions for estimate/money
  answers may `round2` too.

## Key decisions already made (don't relitigate without the owner)

- **Storage**: one versioned JSON blob in localStorage under `qmm.data.v1` (`AppData`, version 1).
- **Smart mix (Leitner)**: boxes 1–5; a fast, correct, un-hinted answer promotes one box but only when the skill
  is due (intervals 0/0/1/2/4/8 days by box), so it can't max out in one sitting; a miss drops one box (not a
  reset) and makes it due now. Difficulty rises with box. Picks: 15% pure random review, otherwise weighted
  by weakness, slowness, due-ness and low box; the last two skills are damped. A missed skill comes back ~2
  problems later with new numbers. A session never serves the same `skillId|answer` twice (catches flipped
  pairs like 11×54 / 54×11). Mastered = box ≥ 4 and ≥ 85% of the last attempts right.
- **"Fast" targets**: default 6/10/15 s by difficulty; skills override with `targetSeconds` (word problems get more).
- **Challenge mode**: per-problem countdown at 1.5× the target; running out counts as a miss.
- **Streak**: counts practice days; one missed day is forgiven, two in a row reset it. Best streak kept.
- **Placement quiz**: level-2 problems in curriculum order; two quick right answers place a skill (box 3); a miss
  or "I don't know this one" moves on; two misses in a row skip the rest of that category.
- **Exact vs estimate** (the owner was told this and didn't object): levels 1–2 exact; level 3 is
  "estimate within 10%" where real numbers get messy (tips, sale prices, tax, what-percent, percent change),
  plus two all-estimate skills (`pct-estimate`, `pct-rule72`). A Settings toggle was offered as an easy add-on.
- **Routing**: hash routes + `base: './'` so the build runs from any static host/subfolder offline.
- **Chart**: single-series inline SVG; line color is a separate `--chart-line` token (#2c55e0 light /
  #6383fb dark) validated against card surfaces.

## Skills registered at handoff (19)

| order | id | category | mode | prereqs |
|---|---|---|---|---|
| 10 | x11 | tricks | exact | – |
| 20 | square-5 | tricks | exact | – |
| 30 | x9-x5-x25 | tricks | exact | – |
| 100 | ltr-add | addsub | exact | – |
| 110 | ltr-sub | addsub | exact | ltr-add |
| 200 | pct-basics | percent | exact | – |
| 205 | pct-1 | percent | exact | pct-basics |
| 210 | pct-20-25-50 | percent | exact | pct-basics |
| 215 | pct-combine | percent | exact | pct-basics, pct-20-25-50 |
| 220 | pct-flip | percent | exact | pct-20-25-50 |
| 225 | pct-tips | percent | exact (L3 estimate) | pct-1, pct-20-25-50 |
| 230 | pct-split | percent | exact | pct-tips |
| 235 | pct-discount | percent | exact (L3 estimate) | pct-combine |
| 240 | pct-tax | percent | exact (L3 estimate) | pct-1 |
| 245 | pct-whole | percent | exact | pct-20-25-50 |
| 250 | pct-what | percent | exact (L3 estimate) | pct-whole |
| 255 | pct-change | percent | exact (L3 estimate) | pct-what |
| 260 | pct-estimate | percent | estimate | pct-tips, pct-discount |
| 265 | pct-rule72 | percent | estimate | pct-change |

Order ranges for new skills: tricks 10–90, addsub 100–190, percent 200–290, multiply 300s, divide 400s,
estimate 500s, extras 600s. Category labels live in `ui/labels.ts` (all seven already defined).

## Step 6 plan (remaining curriculum) — suggested ids

| order | id | skill | notes |
|---|---|---|---|
| 40 | x4-x8 | ×4 and ×8 by doubling | double twice / three times |
| 120 | complements | complements to 100 and 1000, making change | e.g. "$20 − $13.47", "1000 − 638"; prereq ltr-sub |
| 300 | square-2d | squaring 2-digit numbers | up/down to a multiple of 10: 47² = 50×44 + 3² |
| 305 | close-pairs | "close together" pairs | difference of squares: 47×53 = 50² − 3² |
| 310 | mult-2x1 | 2-digit × 1-digit, left to right | |
| 315 | mult-2x2 | 2×2 | addition / subtraction / factoring methods; prereq mult-2x1 |
| 320 | square-3d | 3-digit squares | prereq square-2d |
| 325 | mult-2x3 | 2-digit × 3-digit | prereq mult-2x2 |
| 400 | divide-1d | short division, left to right | |
| 405 | divisibility | rules for 2, 3, 4, 5, 6, 8, 9, 11 | needs a numeric framing (see open decisions) |
| 410 | frac-decimal | fractions to decimals | 1/8 = 0.125; needs >2 decimal places (see gotchas) |
| 500–515 | est-round, est-product, est-quotient, est-sqrt | estimation | answerMode 'estimate'; reuse phrase/tenPercent/exactLine |
| 600 | day-of-week | day of the week for any date | needs a non-numeric answer (see open decisions) |
| 605 | phonetic-code | phonetic (major system) number code | optional; numeric framing: decode a word to its number |

Same verification routine as before: harness + exhaustive per-skill `*.spec.ts` for the trick functions,
`VITE_QMM_SEEDS=20000` stress pass, print sample walkthroughs and read them for wording/articles, then drive
the app in Playwright and look at screenshots.

### Open decisions to confirm with the owner before/early in step 6

1. **Weekday answers** (day-of-week; maybe divisibility yes/no). The keypad is numbers-only. Recommended: add
   a `choices?: string[]` answer type (answer = index) rendered as big buttons in `ProblemSolver`, with grading,
   `formatAnswer`, the mistakes list and the harness updated. Alternative: number the days 0–6 (worse UX).
2. **Divisibility framing**: recommended numeric questions — "remainder when 7,341 is divided by 9?" or
   "which digit makes 4_72 divisible by 9?" — or yes/no via choices once (1) exists.
3. **Phonetic code** (optional per brief): recommended "decode this word into its number" so answers stay numeric.

## Step 7 plan (voice mode)

- `settings.voice` already exists in the schema (default false) but has **no toggle yet** — add it in Settings.
- Every problem already has a symbol-free `spoken` string (enforced by the harness).
- Build in `src/voice/`: `speak.ts` (SpeechSynthesis), `listen.ts` (webkitSpeechRecognition with graceful
  fallback to the keypad when unsupported or denied), `parseSpokenNumber.ts` + thorough unit tests: number
  words ("forty-two" → 42), "to/too/two" → 2, "for/four" → 4, digit-by-digit ("four seven three" → 473),
  "point", "dollars and cents", "percent", "about", hundreds/thousands. Show what was heard; one-tap retry or correct.
- Hands-free mode: read problem → listen → say right/wrong (+ correct answer) → short pause → next;
  a "repeat" voice command.

## Gotchas learned the hard way

- The Bash tool's safety checker rejects some heredocs containing template literals or regexes. Write TS files
  with the file-writing tool, not `cat <<EOF`.
- When editing with Python `str.replace`, it replaces **every** occurrence — assert the match count is 1 first
  (this once put constraints into the wrong skill).
- Walkthrough steps fade in (180 ms) — wait ~400 ms before screenshots or cards look empty.
- The service worker exists only in `npm run build` + `vite preview`, not in `npm run dev`.
- Playwright + Chromium are preinstalled in the original environment; `require('playwright')` and
  `chromium.launch()` work without installing. Use a 390×844 viewport for phone checks.
- tsconfig has `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` on: index results may be undefined
  (use `?? fallback`), and optional props can't be assigned `undefined` (use conditional spreads).
- **NumberPad caps input at 2 decimal places** (`applyKey` in `ui/NumberPad.tsx`) and `isCorrect` treats
  non-integers as equal within 0.005. Fractions-to-decimals (0.125, 0.375) needs both relaxed — e.g. a per-problem
  `decimals` field driving the pad cap and the grading precision.
- Keep `skills/` free of React and of `engine/` imports except pure helpers, so skill files stay testable and
  there are no import cycles (`defineSkill` lives in `define.ts` for that reason).
