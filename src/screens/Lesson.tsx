import { useMemo, useState } from 'react';
import { nextToLearn, statusOf } from '../engine/curriculum';
import { withLearned } from '../engine/progress';
import { go } from '../router';
import { getSkill, hasSkill, makeProblem } from '../skills/registry';
import { getData, updateData, useData } from '../storage/store';
import { ProblemText, Steps, TopBar } from '../ui/bits';
import { CatChip } from '../ui/visuals';
import { ProblemSolver } from '../ui/ProblemSolver';
import { NotFound } from './NotFound';

type Phase =
  | { k: 'idea' }
  | { k: 'worked'; shown: number }
  | { k: 'try'; i: number }
  | { k: 'done' };

/** idea -> worked example (one step per tap) -> 3 try-its -> unlocked. Under two minutes. */
export function Lesson({ id }: { id: string }) {
  if (!hasSkill(id)) return <NotFound />;
  return <LessonFor id={id} />;
}

function LessonFor({ id }: { id: string }) {
  const skill = getSkill(id);
  const data = useData();
  const [phase, setPhase] = useState<Phase>({ k: 'idea' });
  const [score, setScore] = useState(0);
  const tries = useMemo(() => skill.lesson.tryIt.map((r) => makeProblem(skill, r.difficulty, r.seed)), [skill]);

  const status = statusOf(data, skill);
  const close = (): void => go('/');

  if (status === 'locked' && phase.k !== 'done') {
    const missing = skill.prereqs.map(getSkill).filter((p) => !(p.id in data.skills));
    const first = missing[0];
    return (
      <main className="screen">
        <TopBar onBack={close} backIcon="close" backLabel="Close lesson" />
        <div className="screen-body">
          <p className="eyebrow">Locked</p>
          <h1 className="title-xl">{skill.title}</h1>
          <p className="lead">This one builds on {missing.map((m) => m.title).join(' and ')}. Learn that first.</p>
        </div>
        {first && (
          <div className="screen-actions">
            <button className="btn btn-primary" onClick={() => go('/learn/' + first.id, { replace: true })}>
              Learn {first.title}
            </button>
          </div>
        )}
      </main>
    );
  }

  const dotIndex = phase.k === 'idea' ? 0 : phase.k === 'worked' ? 1 : phase.k === 'try' ? 2 + phase.i : 5;
  const dots = (
    <div className="dots" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={i <= dotIndex ? 'is-on' : ''} />
      ))}
    </div>
  );

  if (phase.k === 'idea') {
    return (
      <main className="screen">
        <TopBar onBack={close} backIcon="close" backLabel="Close lesson" title={dots} />
        <div className="screen-body">
          <div>
            <CatChip category={skill.category} />
          </div>
          <h1 className="title-xl">{skill.title}</h1>
          {skill.lesson.idea.map((para, i) => (
            <p key={i} className="lead">
              {para}
            </p>
          ))}
        </div>
        <div className="screen-actions">
          <button className="btn btn-primary" onClick={() => setPhase({ k: 'worked', shown: 1 })}>
            See an example
          </button>
        </div>
      </main>
    );
  }

  if (phase.k === 'worked') {
    const { steps, prompt } = skill.lesson.worked;
    const allShown = phase.shown >= steps.length;
    return (
      <main className="screen">
        <TopBar onBack={close} backIcon="close" backLabel="Close lesson" title={dots} />
        <div className="screen-body">
          <p className="eyebrow">Example</p>
          <ProblemText text={prompt} />
          <div className="card">
            <Steps steps={steps} shown={phase.shown} />
          </div>
        </div>
        <div className="screen-actions">
          <button
            className="btn btn-primary"
            onClick={() => setPhase(allShown ? { k: 'try', i: 0 } : { k: 'worked', shown: phase.shown + 1 })}
          >
            {allShown ? 'Try it yourself' : 'Next step'}
          </button>
        </div>
      </main>
    );
  }

  if (phase.k === 'try') {
    const problem = tries[phase.i];
    if (!problem) return null;
    const last = phase.i === tries.length - 1;
    const onNext = (): void => {
      if (!last) {
        setPhase({ k: 'try', i: phase.i + 1 });
        return;
      }
      updateData((d) => withLearned(d, skill.id, Date.now()));
      setPhase({ k: 'done' });
    };
    return (
      <main className="screen">
        <TopBar
          onBack={close}
          backIcon="close"
          backLabel="Close lesson"
          title={'Try it · ' + (phase.i + 1) + ' of ' + tries.length}
        />
        <ProblemSolver
          key={problem.id}
          problem={problem}
          onAnswered={(r) => r.ok && setScore((s) => s + 1)}
          onNext={onNext}
          nextLabel={last ? 'Finish' : 'Next'}
        />
      </main>
    );
  }

  // done
  const next = nextToLearn(getData());
  return (
    <main className="screen">
      <TopBar onBack={close} backIcon="close" backLabel="Close lesson" title={dots} />
      <div className="screen-body">
        <div className="spacer" />
        <p className="eyebrow center">Unlocked</p>
        <h1 className="title-xl center">{skill.title}</h1>
        <p className="lead center muted">
          {score === tries.length
            ? 'All ' + tries.length + ' right. Practice will make it automatic.'
            : score + ' of ' + tries.length + ' right. Practice will smooth it out.'}
        </p>
        <div className="spacer" />
      </div>
      <div className="screen-actions">
        <button className="btn btn-primary" onClick={() => go('/practice/' + skill.id, { replace: true })}>
          Practice it now
        </button>
        {next && (
          <button className="btn btn-secondary" onClick={() => go('/learn/' + next.id, { replace: true })}>
            Next lesson: {next.title}
          </button>
        )}
        <button className="btn btn-ghost" onClick={close}>
          Home
        </button>
      </div>
    </main>
  );
}
