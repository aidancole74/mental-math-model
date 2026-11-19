import { learnedSkills } from '../engine/curriculum';
import { dayKey } from '../engine/progress';
import { isMastered, mastery } from '../engine/scheduler';
import { computeStreak, streakMessage } from '../engine/streak';
import { go } from '../router';
import { SKILLS } from '../skills/registry';
import { useData } from '../storage/store';
import { Bar, Icon, TopBar, seconds } from '../ui/bits';
import { SpeedChart } from '../ui/SpeedChart';

export function Progress() {
  const data = useData();
  const streak = computeStreak(data.days, dayKey(Date.now()));
  const learned = learnedSkills(data);
  const all = Object.values(data.skills);
  const total = all.reduce((a, p) => a + p.total, 0);
  const correct = all.reduce((a, p) => a + p.correct, 0);
  const mastered = all.filter(isMastered).length;

  const timed = data.sessions.filter((s) => s.avgMs !== null && s.n >= 5);
  const fastest = timed.length ? Math.min(...timed.map((s) => s.avgMs as number)) : null;
  const perfect = data.sessions.filter((s) => s.n >= 5 && s.correct === s.n).length;

  return (
    <main className="screen">
      <TopBar onBack={() => go('/')} title="Progress" />
      <div className="screen-body">
        <div className="card streak">
          <div className={'streak-icon' + (streak.current ? '' : ' is-off')}>
            <Icon name="flame" size={26} />
          </div>
          <div>
            <p className="row-title">
              {streak.current ? streak.current + '-day streak' : 'No streak yet'}
            </p>
            <p className="row-sub">{streakMessage(streak)}</p>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <div className="stat-value">{total}</div>
            <div className="stat-label">Problems solved</div>
          </div>
          <div className="stat">
            <div className="stat-value">{total ? Math.round((correct / total) * 100) + '%' : '—'}</div>
            <div className="stat-label">Accuracy</div>
          </div>
          <div className="stat">
            <div className="stat-value">{data.sessions.length}</div>
            <div className="stat-label">Sessions</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {mastered}
              <span className="muted" style={{ fontSize: '0.6em' }}>
                /{SKILLS.length}
              </span>
            </div>
            <div className="stat-label">Skills mastered</div>
          </div>
        </div>

        <div className="card">
          <p className="row-title">Average time per right answer</p>
          <p className="row-sub" style={{ marginBottom: 12 }}>
            Last {Math.min(30, data.sessions.length)} sessions · lower is faster
          </p>
          <SpeedChart sessions={data.sessions} />
        </div>

        <div className="card">
          <p className="row-title" style={{ marginBottom: 4 }}>
            Personal bests
          </p>
          <div className="kv">
            <span className="muted">Fastest session</span>
            <span className="kv-value">{fastest === null ? '—' : seconds(fastest) + ' avg'}</span>
          </div>
          <div className="kv">
            <span className="muted">Longest streak</span>
            <span className="kv-value">
              {streak.best} {streak.best === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div className="kv">
            <span className="muted">Perfect sessions</span>
            <span className="kv-value">{perfect}</span>
          </div>
        </div>

        <button className="row" onClick={() => go('/mistakes')}>
          <div className="row-main">
            <div className="row-title">Mistakes to review</div>
            <div className="row-sub">
              {data.mistakes.length ? data.mistakes.length + ' to go back over' : 'None right now'}
            </div>
          </div>
          <span className="chip">{data.mistakes.length}</span>
        </button>

        {learned.length > 0 && (
          <section className="list">
            <h2 className="eyebrow section-title">Skill mastery</h2>
            {learned.map((s) => {
              const p = data.skills[s.id];
              if (!p) return null;
              return (
                <button key={s.id} className="row" onClick={() => go('/skill/' + s.id)}>
                  <div className="row-main">
                    <div className="row-title">{s.title}</div>
                    <Bar value={mastery(p)} label={s.title + ' mastery'} />
                  </div>
                  {isMastered(p) && <Icon name="check" size={22} />}
                </button>
              );
            })}
          </section>
        )}

        <button className="btn btn-ghost" onClick={() => go('/placement')}>
          Take the placement quiz
        </button>
      </div>
    </main>
  );
}
