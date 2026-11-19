# Original brief (verbatim from the project owner)

Build a mental math learning app called "Quick Mental Math". Before writing code, read this whole brief, then give me a short plan (file structure, tech choices, build order) and wait for my OK before building.

## Goal
A simple, fast app that helps me get better at mental math. I'll use it a couple of minutes at a time, off and on. It needs a Learn component and a Practice/repetition component. Simplicity and speed to use are the top priorities. Every screen should have one obvious next action.

## Tech
- A web app that works well on a phone and can be added to the home screen (PWA, works offline).
- No backend, no accounts. Store all progress locally (IndexedDB or localStorage), with an export/import-backup option in settings.
- Use React + Vite + TypeScript (or propose something simpler if you think it's better). Keep dependencies minimal.
- Light and dark mode. Large tap targets and large problem text.

## Content source
If a PDF named secrets-of-mental-math.pdf is in the project folder, use it as inspiration for which techniques to teach and in what order (Arthur Benjamin's "Secrets of Mental Math"). The techniques are fine to teach, but write ALL lesson text, examples, and explanations in your own original words. Do not copy passages from the book. You may also add other well-known mental math techniques.

## Core structure: a "skills" system
Each skill is one self-contained entry in a data-driven registry, so adding a new trick later means adding one object. Each skill has:
- id, title, short description, category, prerequisites/unlock order
- a lesson (2 minutes or less): the idea in a couple of sentences, a worked example shown step by step, then 3 "try it" problems with instant feedback
- a problem generator with difficulty levels
- a solution-steps function that produces a step-by-step walkthrough for ANY generated problem (used for "Show me how" after a miss)
- a hint function (reveals only the first step)

Write unit tests for every generator and solution-steps function. Make sure generated answers are always correct and that problems fit the skill's constraints (for example, the carry case for x11).

## Curriculum (in rough order)
1. Quick tricks: x11, squaring numbers ending in 5, x9, x5 and x25 by halving/doubling, x4 and x8 by doubling
2. Left-to-right addition and subtraction (2-digit, then 3-digit), including complements to 100 and 1000 (for making change)
3. **PERCENTAGES (a major section, give this extra depth, see below)**
4. Multiplication: squaring 2-digit numbers, "close together" pairs (difference of squares), 2x1, 2x2, then 3-digit squares and 2x3
5. Division and divisibility rules, fractions to decimals
6. Estimation ("guesstimation"): rounding strategies, estimating products and quotients, square root estimation
7. Fun extras: day of the week for any date; optional memory section on the phonetic number code

## Percentages section (important)
Make this its own track with 10-14 small skills, taught as building blocks that combine:
- 10% (shift the decimal) and 1%, then 5% as half of 10%
- 20% and 25% and 50% (double 10%, a quarter, a half)
- 15% and 30%, 35% etc. by combining 10% and 5% blocks
- The "flip" trick: x% of y = y% of x (for example, 8% of 50 is the same as 50% of 8)
- Tips (15%, 18%, 20%) with real restaurant-bill problems, and splitting the bill
- Sale prices and discounts ("30% off $84", "what's the final price")
- Sales tax and adding a percentage on top
- Finding the whole: "20 is 25% of what?"
- "What percent is X of Y?" (estimating and exact easy cases)
- Percent change (increase/decrease), and why a 50% increase followed by a 50% decrease doesn't get you back
- Quick estimation versions of all of the above (round to a friendly number, then adjust)
- Optional: compound growth estimates (rule of 72)
Problems in this track should be framed in realistic contexts (bill, price tag, salary raise), with some plain "what is 15% of 64?" drills mixed in. Provide both an exact mode and an "estimate within 10%" mode where it makes sense.

## Practice
- A big "Quick Session" button on the home screen: 2 minutes or 10 problems, whichever the user picks in settings.
- Smart mix: track accuracy and response time per skill. Serve more of the weak or slow ones and fewer of the mastered ones (simple Leitner/spaced-repetition style, with a small amount of random review of old skills). Only draw from skills the user has unlocked, but allow a "practice a specific skill" option.
- Custom number pad input with a large display. Instant feedback. After a miss, a "Show me how" button runs the walkthrough on that exact problem.
- Hint button. Optional timer: relaxed (no timer) versus challenge mode.
- End-of-session summary: accuracy, average speed, one skill to review.

## Progress
- Per-skill mastery bars, personal bests, and average speed over time (a simple chart is fine).
- A forgiving daily streak (don't punish a missed day harshly).
- A "mistakes to review" list.
- Optional placement quiz so the user can skip what they already know.

## Voice practice (build this after the text version works, behind a settings toggle)
- Problem read aloud using the browser's SpeechSynthesis.
- Spoken answer via the browser's speech recognition (webkitSpeechRecognition), with graceful fallback to the keypad if it's unsupported or denied.
- Robust number parsing: handle digits and number words ("forty-two" becomes 42), common mishearings ("to/too" becomes 2, "for" becomes 4), and digit-by-digit speech. Show what was heard and allow a one-tap retry or correction.
- Hands-free mode: read the problem, listen, say whether it was right (and the correct answer if not), then move on automatically. Add a short pause between problems and a "repeat" voice command.
- Write unit tests for the number-word parser.

## UX principles
- The home screen has two main buttons: "Continue learning" and "Quick practice". Everything else is secondary.
- No clutter, no popups, no required sign-in.
- Everything usable one-handed on a phone.

## Build order
1. Project setup, skills registry, and the generator/solution-step framework with tests
2. First 6 skills: x11, squaring numbers ending in 5, left-to-right addition, left-to-right subtraction, 10%/5%/15% percentages, x9/x5/x25
3. Lesson screen, practice session screen, local progress saving, smart mix
4. Progress screen and polish (PWA install, offline, dark mode)
5. The rest of the percentages track
6. Remaining curriculum
7. Voice mode

Start with the plan and wait for my approval. After each build step, tell me how to run it and what to test.
