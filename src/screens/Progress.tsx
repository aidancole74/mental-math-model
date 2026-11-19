import { dayKey } from '../engine/progress';
import { isMastered } from '../engine/scheduler';
import { categoryStats, weekStrip } from '../engine/stats';
import { computeStreak, streakMessage } from '../engine/streak';
import { go } from '../router';
import { SKILLS } from '../skills/registry';
import { useData } from '../storage/store';
import { Bar, Icon, seconds } from '../ui/bits';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../ui/labels';
import { SpeedChart } from '../ui/SpeedChart';
import { CatTile, PageHead } from '../ui/visuals';

export function Progress() {
  const data = useData();
  const streak = computeStreak(data.days, dayKey(Date.now()));
  const week = weekStrip(data.days, Date.now());
  const all = Object.values(data.skills);
  const total = all.reduce((a, p) => a + p.total, 0);
  const correct = all.reduce((a, p) => a + p.correct, 0);
  const mastered = all.filter(isMastered).length;

  const timed = data.sessions.filter((s) => s.avgMs !== null && s.n >= 5);
  const fastest = timed.length ? Math.min(...timed.map((s) => s.avgMs as number)) : null;
  const perfect = data.sessions.filter((s) => s.n >= 5 && s.correct === s.n).length;

  return (
    <main className="screen">
      <div className="screen-body">
        <PageHead title="Progress" sub={total ? total + ' problems solved so far' : 'Your numbers will show up here'} />
        <div className="card">
          <div className="streak">
            <div className={'streak-icon' + (streak.current ? '' : ' is-off')}>
              <Icon name="flame" size={26} />
            </div>
            <div>
              <p className="row-title">{streak.current ? streak.current + '-day streak' : 'No streak yet'}</p>
              <p className="row-sub">{streakMessage(streak)}</p>
            </div>
          </div>
          <div className="week" style={{ marginTop: 16 }}>
            {week.map((d) => (
              <div
                key={d.key}
                className={'week-day' + (d.practised ? ' is-done' : '') + (d.isToday ? ' is-today' : '')}
              >
                <span className="week-dot">{d.practised && <Icon name="check" size={16} />}</span>
                {d.label}
              </div>
            ))}
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

        <button className="row" onClick={() => go('/mistakes')}>
          <div className="row-main">
            <div className="row-title">Mistakes to review</div>
            <div className="row-sub">
              {data.mistakes.length ? data.mistakes.length + ' to go back over' : 'None right now'}
            </div>
          </div>
          <span className="chip">{data.mistakes.length}</span>
        </button>

        <div className="card">
          <p className="row-title">Average time per right answer</p>
          <p className="row-sub" style={{ marginBottom: 12 }}>
            Last {Math.min(30, data.sessions.length)} sessions · lower is faster
          </p>
          <SpeedChart sessions={data.sessions} />
        </div>

        <div className="card">
          <p className="row-title">By category</p>
          <p className="row-sub" style={{ marginBottom: 6 }}>
            Learned, mastered and lifetime accuracy
          </p>
          {CATEGORY_ORDER.map((cat) => {
            const st = categoryStats(data, cat);
            return (
              <div key={cat} className={'breakdown-row cat-' + cat}>
                <CatTile category={cat} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 650, marginBottom: 6 }}>{CATEGORY_LABELS[cat]}</div>
                  <Bar value={st.total ? st.learned / st.total : 0} label={CATEGORY_LABELS[cat] + ' learned'} />
                </div>
                <div className="breakdown-nums">
                  <strong>
                    {st.learned}/{st.total}
                  </strong>{' '}
                  learned
                  <br />
                  {st.mastered} mastered · {st.accuracy === null ? '—' : Math.round(st.accuracy * 100) + '%'}
                </div>
              </div>
            );
          })}
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
      </div>
    </main>
  );
}
