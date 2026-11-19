import { useRef, useState } from 'react';
import { nextToLearn } from '../engine/curriculum';
import {
  answerPlacement,
  applyPlacement,
  isPlacementDone,
  placedIds,
  skipPlacementSkill,
  startPlacement,
  type PlacementState,
} from '../engine/placement';
import { go } from '../router';
import { getSkill } from '../skills/registry';
import { createRng, randomSeed } from '../skills/rng';
import { getData, updateData } from '../storage/store';
import { TopBar } from '../ui/bits';
import { ProblemSolver, type SolveResult } from '../ui/ProblemSolver';

type Phase = 'intro' | 'quiz' | 'done';

export function Placement() {
  const [rng] = useState(() => createRng(randomSeed()));
  const [phase, setPhase] = useState<Phase>('intro');
  const [state, setState] = useState<PlacementState>(() => startPlacement(getData(), rng));
  const pending = useRef<SolveResult | null>(null);
  const [placed, setPlaced] = useState<string[]>([]);

  const finish = (s: PlacementState): void => {
    updateData((d) => applyPlacement(d, s, Date.now()));
    setPlaced(placedIds(s));
    setPhase('done');
  };

  const move = (next: PlacementState): void => {
    if (isPlacementDone(next)) finish(next);
    else setState(next);
  };

  if (phase === 'intro') {
    return (
      <main className="screen">
        <TopBar onBack={() => go('/')} backIcon="close" backLabel="Close" />
        <div className="screen-body">
          <div className="spacer" />
          <p className="eyebrow">Placement quiz</p>
          <h1 className="title-xl">Skip what you already know</h1>
          <p className="lead">
            You’ll get a problem or two for each trick. Answer two quickly and correctly, and that lesson is marked as
            learned.
          </p>
          <p className="lead muted">Not sure about one? Tap “I don’t know this one” and move on. You can stop any time.</p>
          <div className="spacer" />
        </div>
        <div className="screen-actions">
          <button className="btn btn-primary" onClick={() => (state.current ? setPhase('quiz') : finish(state))}>
            Start
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'done') {
    const next = nextToLearn(getData());
    return (
      <main className="screen">
        <div className="screen-body">
          <div className="spacer" />
          <p className="eyebrow center">Placement done</p>
          <h1 className="title-xl center">
            {placed.length === 0
              ? 'Starting from the top'
              : 'Skipped ' + placed.length + (placed.length === 1 ? ' lesson' : ' lessons')}
          </h1>
          {placed.length > 0 && (
            <div className="card">
              {placed.map((id) => (
                <div key={id} className="kv">
                  <span>{getSkill(id).title}</span>
                  <span className="kv-value" style={{ color: 'var(--good)' }}>
                    Learned
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="lead center muted">
            {next ? 'Next up: ' + next.title + '.' : 'Every lesson is unlocked. Time to practise.'}
          </p>
          <div className="spacer" />
        </div>
        <div className="screen-actions">
          <button className="btn btn-primary" onClick={() => go('/', { replace: true })}>
            Continue
          </button>
        </div>
      </main>
    );
  }

  const problem = state.current;
  if (!problem) return null;

  return (
    <main className="screen">
      <TopBar
        onBack={() => finish(state)}
        backIcon="close"
        backLabel="Stop and keep results"
        title={getSkill(problem.skillId).title}
      />
      <ProblemSolver
        key={problem.id}
        problem={problem}
        allowHint={false}
        allowShowHow={false}
        secondaryAction={{ label: 'I don’t know this one', onClick: () => move(skipPlacementSkill(state, rng)) }}
        onAnswered={(r) => {
          pending.current = r;
        }}
        onNext={() => {
          const r = pending.current;
          pending.current = null;
          if (r) move(answerPlacement(state, r.ok, r.ms, rng));
        }}
      />
    </main>
  );
}
