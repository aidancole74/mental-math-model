import { useCallback, useEffect, useRef, useState } from 'react';
import { decimalsOf, formatAnswer, formatRange, isCorrect, parseAnswer } from '../engine/grading';
import { getSkill } from '../skills/registry';
import type { Problem } from '../skills/types';
import { Bar, ProblemText, Steps } from './bits';
import { ChoicePad } from './ChoicePad';
import { NumberPad, applyKey, type PadKey } from './NumberPad';

export interface SolveResult {
  ok: boolean;
  ms: number;
  hint: boolean;
  /** null when the challenge clock ran out. */
  given: string | null;
}

/** How long a right answer stays on screen before moving on. */
const RIGHT_PAUSE_MS = 650;

type Phase = 'answering' | 'right' | 'wrong';

/**
 * One problem, start to finish. Render with key={problem.id} so each new
 * problem gets fresh state.
 *
 *   answering -> right  (auto-advances)
 *             -> wrong  (shows the answer; "Show me how" + "Next")
 */
export function ProblemSolver({
  problem,
  timeLimitMs = null,
  onAnswered,
  onNext,
  nextLabel = 'Next',
  allowHint = true,
  allowShowHow = true,
  secondaryAction,
}: {
  problem: Problem;
  /** Placement quiz turns these off. */
  allowHint?: boolean;
  allowShowHow?: boolean;
  /** Replaces the Hint button while answering, e.g. "I don't know this one". */
  secondaryAction?: { label: string; onClick: () => void };
  /** Challenge mode countdown; null = relaxed. */
  timeLimitMs?: number | null;
  onAnswered: (result: SolveResult) => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  const skill = getSkill(problem.skillId);
  const choices = problem.answerKind === 'choice' ? (problem.choices ?? []) : null;
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('answering');
  const [hint, setHint] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(performance.now());

  // Latest callbacks, so timers never call stale ones.
  const cb = useRef({ onAnswered, onNext });
  cb.current = { onAnswered, onNext };

  const finish = useCallback(
    (given: string | null) => {
      const ms = Math.round(performance.now() - startedAt.current);
      const value = given === null ? null : parseAnswer(given);
      const ok = value !== null && isCorrect(problem, value);
      setPhase(ok ? 'right' : 'wrong');
      cb.current.onAnswered({ ok, ms, hint: hint !== null, given });
    },
    [problem, hint],
  );

  const press = useCallback(
    (key: PadKey) => {
      if (phase !== 'answering') {
        if (key === 'enter' && phase === 'wrong') cb.current.onNext();
        return;
      }
      if (key === 'enter') {
        if (parseAnswer(input) !== null) finish(input);
        return;
      }
      if (choices) {
        // Digit keys pick a choice by position (1 = first); one press answers.
        const i = Number(key) - 1;
        if (/^[0-9]$/.test(key) && i >= 0 && i < choices.length) pick(i);
        return;
      }
      setInput((cur) => applyKey(cur, key, 9, decimalsOf(problem)));
    },
    [phase, input, finish, choices, problem],
  );

  function pick(i: number): void {
    if (phase !== 'answering') return;
    setInput(String(i));
    finish(String(i));
  }

  // Physical keyboard: digits, ".", Backspace, Enter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Let a focused button handle its own Enter/Space.
      if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof HTMLButtonElement) return;
      let key: PadKey | null = null;
      if (/^[0-9]$/.test(e.key)) key = e.key as PadKey;
      else if (e.key === '.' || e.key === ',') key = '.';
      else if (e.key === 'Backspace') key = 'back';
      else if (e.key === 'Enter') key = 'enter';
      if (key) {
        e.preventDefault();
        press(key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  // Right answers move on by themselves.
  useEffect(() => {
    if (phase !== 'right') return;
    const t = window.setTimeout(() => cb.current.onNext(), RIGHT_PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Challenge countdown.
  useEffect(() => {
    if (timeLimitMs === null || phase !== 'answering') return;
    const id = window.setInterval(() => {
      const e = performance.now() - startedAt.current;
      setElapsed(e);
      if (e >= timeLimitMs) {
        window.clearInterval(id);
        setTimedOut(true);
        finish(null);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [timeLimitMs, phase, finish]);

  const answerClass = 'answer' + (phase === 'right' ? ' is-right' : phase === 'wrong' && !timedOut ? ' is-wrong' : '');

  return (
    <>
      <div className="screen-body">
        {problem.tolerance !== undefined && <p className="estimate-badge">≈ Estimate · within 10%</p>}

        <ProblemText text={problem.prompt} />

        <div className={answerClass} aria-live="polite">
          {problem.unit && (input || phase !== 'answering') ? <span>{problem.unit}</span> : null}
          {input ? (
            <span>{choices ? choices[Number(input)] : input}</span>
          ) : phase === 'answering' ? (
            <span className="placeholder">?</span>
          ) : (
            <span>—</span>
          )}
          {phase === 'answering' && !choices && <span className="caret" />}
          {problem.suffix && (input || phase !== 'answering') ? <span>{problem.suffix}</span> : null}
        </div>

        {timeLimitMs !== null && phase === 'answering' && (
          <div className="countdown">
            <Bar value={1 - elapsed / timeLimitMs} urgent={elapsed > timeLimitMs * 0.7} label="Time left" />
          </div>
        )}

        {phase === 'answering' && hint && <p className="feedback feedback-hint">{hint}</p>}

        {phase === 'right' && (
          <p className="feedback feedback-right">
            {problem.tolerance !== undefined ? 'Close enough — exact is ' + formatAnswer(problem) : 'Correct'}
          </p>
        )}

        {phase === 'wrong' && (
          <div className="feedback feedback-wrong" role="status">
            {timedOut ? 'Time’s up. ' : ''}
            {problem.tolerance !== undefined ? 'The exact answer is ' : 'The answer is '}
            <strong>{formatAnswer(problem)}</strong>
            {problem.tolerance !== undefined && (
              <span className="range">Anything from {formatRange(problem)} counts.</span>
            )}
          </div>
        )}

        {phase === 'wrong' && showHow && (
          <div className="card">
            <Steps steps={skill.solve(problem)} />
          </div>
        )}
      </div>

      <div className="screen-actions">
        {phase !== 'wrong' && (
          <>
            {/* Stays in the layout (hidden) once used, so the pad never jumps. */}
            {secondaryAction ? (
              <button
                className="btn btn-ghost"
                style={{ visibility: phase !== 'answering' ? 'hidden' : 'visible' }}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </button>
            ) : (
              <button
                className="btn btn-ghost"
                style={{ visibility: !allowHint || hint || phase !== 'answering' ? 'hidden' : 'visible' }}
                onClick={() => setHint(skill.hint(problem))}
                tabIndex={allowHint ? 0 : -1}
              >
                Hint
              </button>
            )}
            {choices ? (
              <ChoicePad
                choices={choices}
                onPick={pick}
                disabled={phase !== 'answering'}
                picked={input === '' ? null : Number(input)}
              />
            ) : (
              <NumberPad onKey={press} canSubmit={phase === 'answering' && parseAnswer(input) !== null} />
            )}
          </>
        )}
        {phase === 'wrong' && (
          <>
            {allowShowHow && !showHow && (
              <button className="btn btn-secondary" onClick={() => setShowHow(true)}>
                Show me how
              </button>
            )}
            <button className="btn btn-primary" onClick={() => cb.current.onNext()}>
              {nextLabel}
            </button>
          </>
        )}
      </div>
    </>
  );
}
