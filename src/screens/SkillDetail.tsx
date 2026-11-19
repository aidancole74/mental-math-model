import { statusOf } from '../engine/curriculum';
import { averageMs, mastery, recentAccuracy } from '../engine/scheduler';
import { go } from '../router';
import { getSkill, hasSkill } from '../skills/registry';
import { useData } from '../storage/store';
import { Bar, TopBar, seconds } from '../ui/bits';
import { CATEGORY_LABELS } from '../ui/labels';
import { NotFound } from './NotFound';

export function SkillDetail({ id }: { id: string }) {
  const data = useData();
  if (!hasSkill(id)) return <NotFound />;
  const skill = getSkill(id);
  const status = statusOf(data, skill);
  const p = data.skills[id];
  const acc = p ? recentAccuracy(p) : null;

  return (
    <main className="screen">
      <TopBar onBack={() => go('/skills')} />
      <div className="screen-body">
        <p className="eyebrow">{CATEGORY_LABELS[skill.category]}</p>
        <h1 className="title-xl">{skill.title}</h1>
        <p className="lead muted">{skill.blurb}</p>

        {p && (
          <>
            <div className="card">
              <p className="eyebrow" style={{ marginBottom: 10 }}>
                Mastery
              </p>
              <Bar value={mastery(p)} label="Mastery" />
            </div>
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-value">{acc === null ? '—' : Math.round(acc * 100) + '%'}</div>
                <div className="stat-label">Recent accuracy</div>
              </div>
              <div className="stat">
                <div className="stat-value">{seconds(averageMs(p))}</div>
                <div className="stat-label">Recent avg</div>
              </div>
              <div className="stat">
                <div className="stat-value">{seconds(p.fastestMs)}</div>
                <div className="stat-label">Personal best</div>
              </div>
              <div className="stat">
                <div className="stat-value">{p.total}</div>
                <div className="stat-label">Problems done</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="screen-actions">
        {status === 'learned' && (
          <>
            <button className="btn btn-primary" onClick={() => go('/practice/' + id)}>
              Practice this skill
            </button>
            <button className="btn btn-secondary" onClick={() => go('/learn/' + id)}>
              Review the lesson
            </button>
          </>
        )}
        {status === 'available' && (
          <button className="btn btn-primary" onClick={() => go('/learn/' + id)}>
            Start the lesson
          </button>
        )}
        {status === 'locked' && (
          <button className="btn btn-primary" onClick={() => go('/learn/' + id)}>
            See what to learn first
          </button>
        )}
      </div>
    </main>
  );
}
