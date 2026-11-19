import { useEffect, useState } from 'react';
import { withAttempt, withSession } from '../engine/progress';
import {
  advance,
  answerCurrent,
  canStart,
  challengeLimitMs,
  configFor,
  isOver,
  secondsLeft,
  startSession,
  summarize,
  toRecord,
  type SessionState,
} from '../engine/session';
import { go } from '../router';
import { hasSkill } from '../skills/registry';
import { createRng, randomSeed } from '../skills/rng';
import { getData, setLastSummary, updateData } from '../storage/store';
import { Bar, TopBar } from '../ui/bits';
import { ProblemSolver, type SolveResult } from '../ui/ProblemSolver';

function clock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m + ':' + String(s).padStart(2, '0');
}

/** Ticks once a second while `active`. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export function Session({ focus }: { focus: string | null }) {
  const [rng] = useState(() => createRng(randomSeed()));
  const [state, setState] = useState<SessionState | null>(() => {
    const data = getData();
    if (focus !== null && !hasSkill(focus)) return null;
    if (!canStart(data, focus)) return null;
    return startSession(data, configFor(data, focus), Date.now(), rng);
  });
  const now = useNow(state?.config.kind === 'time');

  useEffect(() => {
    if (!state) go('/', { replace: true });
  }, [state]);

  if (!state) return null;

  const finish = (s: SessionState): void => {
    if (s.results.length === 0) {
      go('/', { replace: true });
      return;
    }
    const summary = summarize(s.results);
    updateData((d) => withSession(d, toRecord(s, summary)));
    setLastSummary({ summary, focus });
    go('/summary', { replace: true });
  };

  const onAnswered = (r: SolveResult): void => {
    const problem = state.current;
    updateData((d) => withAttempt(d, { problem, ...r }, Date.now()));
    setState(
      answerCurrent(state, {
        problemId: problem.id,
        skillId: problem.skillId,
        difficulty: problem.difficulty,
        ok: r.ok,
        ms: r.ms,
        hint: r.hint,
        given: r.given,
      }),
    );
  };

  const onNext = (): void => {
    const t = Date.now();
    if (isOver(state, t)) finish(state);
    else setState(advance(state, getData(), t, rng));
  };

  const left = secondsLeft(state, now);
  const answered = state.results.length;
  const onScreen = state.servedIds.length; // 1-based number of the problem showing
  const { count, seconds } = state.config;
  const title =
    left === null
      ? Math.min(onScreen, count) + ' of ' + count
      : left === 0
        ? 'Last one'
        : clock(left);
  const progress = left === null ? answered / count : 1 - left / seconds;

  return (
    <main className="screen">
      <TopBar onBack={() => finish(state)} backIcon="close" backLabel="End session" title={title} />
      <div style={{ marginBottom: 12 }}>
        <Bar value={progress} label="Session progress" />
      </div>
      <ProblemSolver
        key={state.current.id}
        problem={state.current}
        timeLimitMs={state.config.challenge ? challengeLimitMs(state.current) : null}
        onAnswered={onAnswered}
        onNext={onNext}
      />
    </main>
  );
}
