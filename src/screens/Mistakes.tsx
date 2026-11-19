import { useState } from 'react';
import { formatAnswer, formatGiven } from '../engine/grading';
import { withAttempt, withoutMistake } from '../engine/progress';
import { go } from '../router';
import { getSkill, hasSkill, problemFromId } from '../skills/registry';
import type { Problem } from '../skills/types';
import type { Mistake } from '../storage/schema';
import { getData, updateData, useData } from '../storage/store';
import { Steps, TopBar } from '../ui/bits';
import { ProblemSolver } from '../ui/ProblemSolver';

interface Entry {
  mistake: Mistake;
  problem: Problem;
}

/** Newest first; drops entries whose skill no longer exists. */
function entries(mistakes: Mistake[]): Entry[] {
  return [...mistakes]
    .reverse()
    .filter((m) => hasSkill(m.skillId))
    .flatMap((m) => {
      try {
        return [{ mistake: m, problem: problemFromId(m.problemId) }];
      } catch {
        return [];
      }
    });
}

export function Mistakes() {
  const data = useData();
  const list = entries(data.mistakes);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <main className="screen">
      <TopBar onBack={() => go('/progress')} title="Mistakes to review" />
      <div className="screen-body">
        {list.length === 0 ? (
          <>
            <div className="spacer" />
            <p className="title-xl center">Nothing to review</p>
            <p className="lead center muted">Problems you miss land here so you can try them again.</p>
            <div className="spacer" />
          </>
        ) : (
          <div className="list">
            {list.map(({ mistake, problem }) => (
              <div key={problem.id}>
                <button
                  className="row"
                  aria-expanded={open === problem.id}
                  onClick={() => setOpen(open === problem.id ? null : problem.id)}
                >
                  <div className="row-main">
                    <div className="row-title">{problem.prompt}</div>
                    <div className="mistake-answers">
                      {mistake.given ? (
                        <span className="given">{formatGiven(problem, mistake.given)}</span>
                      ) : (
                        <span className="muted">Ran out of time</span>
                      )}
                      <span className="right">{formatAnswer(problem)}</span>
                    </div>
                  </div>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>
                    {open === problem.id ? 'Hide' : 'How'}
                  </span>
                </button>
                {open === problem.id && (
                  <div className="card" style={{ marginTop: 8 }}>
                    <p className="eyebrow" style={{ marginBottom: 10 }}>
                      {getSkill(problem.skillId).title}
                    </p>
                    <Steps steps={getSkill(problem.skillId).solve(problem)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="screen-actions">
        {list.length > 0 ? (
          <button className="btn btn-primary" onClick={() => go('/mistakes/retry')}>
            Retry {list.length === 1 ? 'it' : 'all ' + list.length}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => go('/', { replace: true })}>
            Home
          </button>
        )}
      </div>
    </main>
  );
}

/** Works through the list once. A right answer clears the mistake. */
export function MistakesRetry() {
  const [queue] = useState(() => entries(getData().mistakes).map((e) => e.problem));
  const [i, setI] = useState(0);
  const [cleared, setCleared] = useState(0);
  const problem = queue[i];

  if (!problem) {
    return (
      <main className="screen">
        <div className="screen-body">
          <div className="spacer" />
          <p className="eyebrow center">Review done</p>
          <p className="big-number">
            {cleared}
            <span className="muted" style={{ fontSize: '0.5em' }}>
              /{queue.length}
            </span>
          </p>
          <p className="lead center muted">
            {cleared === queue.length
              ? 'All cleared from your list.'
              : 'Cleared ' + cleared + '. The rest stay on your list for next time.'}
          </p>
          <div className="spacer" />
        </div>
        <div className="screen-actions">
          <button className="btn btn-primary" onClick={() => go('/progress', { replace: true })}>
            Done
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <TopBar
        onBack={() => go('/mistakes', { replace: true })}
        backIcon="close"
        backLabel="Stop reviewing"
        title={i + 1 + ' of ' + queue.length}
      />
      <ProblemSolver
        key={problem.id}
        problem={problem}
        onAnswered={(r) => {
          const now = Date.now();
          updateData((d) => {
            const after = withAttempt(d, { problem, ...r }, now);
            return r.ok ? withoutMistake(after, problem.id) : after;
          });
          if (r.ok) setCleared((c) => c + 1);
        }}
        onNext={() => setI((n) => n + 1)}
      />
    </main>
  );
}
