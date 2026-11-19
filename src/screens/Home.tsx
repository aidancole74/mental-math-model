import { learnedSkills, nextToLearn } from '../engine/curriculum';
import { dayKey } from '../engine/progress';
import { isMastered, mastery } from '../engine/scheduler';
import { dueCount, greeting, overallAccuracy, reviewPicks, weekStrip } from '../engine/stats';
import { computeStreak, streakMessage } from '../engine/streak';
import { go } from '../router';
import { SKILLS, getSkill } from '../skills/registry';
import { useData } from '../storage/store';
import { Icon } from '../ui/bits';
import { CatTile, PageHead, Ring } from '../ui/visuals';

/**
 * The dashboard. Two main actions at the bottom, in thumb reach; everything
 * above them is a glance at where you stand.
 */
export function Home() {
  const data = useData();
  const now = Date.now();
  const next = nextToLearn(data);
  const learned = learnedSkills(data).length;
  const canPractice = learned > 0;
  const sessionLabel = data.settings.sessionKind === 'count' ? '10 problems' : '2 minutes';
  const streak = computeStreak(data.days, dayKey(now));
  const week = weekStrip(data.days, now);
  const mastered = Object.values(data.skills).filter(isMastered).length;
  const acc = overallAccuracy(data);
  const due = dueCount(data, now);
  const picks = reviewPicks(data, now, 2);

  return (
    <main className="screen">
      <div className="screen-body">
        <PageHead
          title={greeting(now)}
          sub={learned === 0 ? 'Ready for your first trick?' : learned + ' of ' + SKILLS.length + ' skills learned'}
          right={
            <span
              className={'streak-chip' + (streak.current ? '' : ' is-off')}
              aria-label={streak.current + '-day streak'}
            >
              <Icon name="flame" size={18} />
              {streak.current}
            </span>
          }
        />

        {learned === 0 ? (
          <div className="card">
            <p className="eyebrow">Welcome</p>
            <p className="lead" style={{ marginTop: 8 }}>
              Learn a mental-math trick in under two minutes, then make it automatic with quick practice rounds.
            </p>
            <ul className="welcome-list">
              <li>
                <Icon name="book" size={20} /> {SKILLS.length} skills, from ×11 to the day of the week for any date
              </li>
              <li>
                <Icon name="target" size={20} /> Practice adapts to what you find hard
              </li>
              <li>
                <Icon name="flame" size={20} /> A forgiving streak: one missed day is free
              </li>
            </ul>
          </div>
        ) : (
          <>
            <button className="card week-card" onClick={() => go('/progress')} aria-label="This week — open progress">
              <p className="row-title">This week</p>
              <p className="row-sub" style={{ marginBottom: 12 }}>
                {streakMessage(streak)}
              </p>
              <div className="week">
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
            </button>

            <div className="mini-stats">
              <button className="mini-stat" onClick={() => go('/skills')}>
                <div className="stat-value">
                  {mastered}
                  <span className="muted" style={{ fontSize: '0.6em' }}>
                    /{learned}
                  </span>
                </div>
                <div className="stat-label">Mastered</div>
              </button>
              <button className="mini-stat" onClick={() => go('/progress')}>
                <div className="stat-value">{acc === null ? '—' : Math.round(acc * 100) + '%'}</div>
                <div className="stat-label">Accuracy</div>
              </button>
              <button className="mini-stat" onClick={() => go('/mistakes')}>
                <div className="stat-value" style={data.mistakes.length ? { color: 'var(--bad)' } : undefined}>
                  {data.mistakes.length}
                </div>
                <div className="stat-label">To review</div>
              </button>
            </div>

            {picks.length > 0 && (
              <section className="list" aria-label="Worth a quick review">
                <p className="eyebrow section-head">Worth a quick review</p>
                {picks.map((id) => {
                  const s = getSkill(id);
                  const p = data.skills[id];
                  return (
                    <button
                      key={id}
                      className={'row cat-' + s.category}
                      style={{ minHeight: 60 }}
                      onClick={() => go('/practice/' + id)}
                    >
                      <Ring value={p ? mastery(p) : 0} size={36} stroke={4} color="var(--cat)" />
                      <div className="row-main">
                        <div className="row-title">{s.title}</div>
                        <div className="row-sub">{p && now >= p.dueAt ? 'Due now' : 'Least practised'}</div>
                      </div>
                      <span className="muted" style={{ display: 'grid' }}>
                        <Icon name="play" size={18} />
                      </span>
                    </button>
                  );
                })}
              </section>
            )}
          </>
        )}
        <div className="spacer" />
      </div>

      <div className="screen-actions">
        <button
          className={'btn action-btn ' + (canPractice ? 'btn-tonal' : 'btn-primary')}
          onClick={() => go(next ? '/learn/' + next.id : '/skills')}
        >
          <span className="action-icon">
            {next ? <CatTile category={next.category} size={36} /> : <Icon name="book" size={26} />}
          </span>
          <span className="action-text">
            <span className="action-title">Continue learning</span>
            <span className="action-sub">{next ? 'Next: ' + next.title : 'All lessons done — browse skills'}</span>
          </span>
          <Icon name="chevron" size={22} />
        </button>

        <button
          className={'btn action-btn ' + (canPractice ? 'btn-primary' : 'btn-secondary')}
          disabled={!canPractice}
          onClick={() => go('/practice')}
        >
          <span className="action-icon">
            <Icon name="play" size={26} />
          </span>
          <span className="action-text">
            <span className="action-title">Quick practice</span>
            <span className="action-sub">
              {canPractice ? sessionLabel + ' · smart mix' + (due ? ' · ' + due + ' due' : '') : 'Learn a trick first'}
            </span>
          </span>
          <Icon name="chevron" size={22} />
        </button>

        {learned === 0 && (
          <button className="btn btn-ghost" onClick={() => go('/placement')}>
            Already know some tricks? Take the placement quiz
          </button>
        )}
      </div>
    </main>
  );
}
