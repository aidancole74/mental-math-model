import { learnedSkills, nextToLearn } from '../engine/curriculum';
import { dayKey } from '../engine/progress';
import { computeStreak } from '../engine/streak';
import { go } from '../router';
import { SKILLS } from '../skills/registry';
import { useData } from '../storage/store';
import { Bar, Icon, TopBar } from '../ui/bits';

/** Two big buttons. Everything else is secondary. */
export function Home() {
  const data = useData();
  const next = nextToLearn(data);
  const learned = learnedSkills(data).length;
  const canPractice = learned > 0;
  const sessionLabel = data.settings.sessionKind === 'count' ? '10 problems' : '2 minutes';
  const streak = computeStreak(data.days, dayKey(Date.now()));

  return (
    <main className="screen">
      <TopBar
        title="Quick Mental Math"
        right={
          <button className="icon-btn" onClick={() => go('/settings')} aria-label="Settings">
            <Icon name="settings" />
          </button>
        }
      />

      <div className="screen-body">
        <div className="spacer" />
        {learned === 0 ? (
          <div className="card">
            <p className="eyebrow">Welcome</p>
            <p className="lead" style={{ marginTop: 6 }}>
              Start with your first trick. Each lesson takes under two minutes.
            </p>
          </div>
        ) : (
          <button className="card row" style={{ display: 'block' }} onClick={() => go('/progress')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span className="eyebrow">
                {learned} of {SKILLS.length} learned
              </span>
              {streak.current > 0 && (
                <span className="chip" aria-label={streak.current + '-day streak'}>
                  <Icon name="flame" size={16} /> {streak.current}
                </span>
              )}
            </div>
            <div style={{ marginTop: 10 }}>
              <Bar value={learned / SKILLS.length} label="Tricks learned" />
            </div>
          </button>
        )}
      </div>

      <div className="screen-actions">
        <button
          className={'btn hero-btn ' + (canPractice ? 'btn-tonal' : 'btn-primary')}
          onClick={() => go(next ? '/learn/' + next.id : '/skills')}
        >
          <span className="hero-title">Continue learning</span>
          <span className="hero-sub">{next ? 'Next: ' + next.title : 'All lessons done — browse skills'}</span>
        </button>

        <button
          className={'btn hero-btn ' + (canPractice ? 'btn-primary' : 'btn-secondary')}
          disabled={!canPractice}
          onClick={() => go('/practice')}
        >
          <span className="hero-title">Quick practice</span>
          <span className="hero-sub">{canPractice ? sessionLabel + ' · smart mix' : 'Learn a trick first'}</span>
        </button>

        {learned === 0 ? (
          <button className="btn btn-ghost" onClick={() => go('/placement')}>
            Already know some tricks? Take the placement quiz
          </button>
        ) : (
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => go('/skills')}>
              <Icon name="list" size={20} /> Skills
            </button>
            <button className="btn btn-ghost" onClick={() => go('/progress')}>
              <Icon name="flame" size={20} /> Progress
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
