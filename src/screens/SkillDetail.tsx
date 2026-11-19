import { statusOf } from '../engine/curriculum';
import { averageMs, isMastered, mastery, recentAccuracy } from '../engine/scheduler';
import { go } from '../router';
import { getSkill, hasSkill } from '../skills/registry';
import type { SkillProgress } from '../storage/schema';
import { useData } from '../storage/store';
import { Icon, TopBar, seconds } from '../ui/bits';
import { CATEGORY_LABELS } from '../ui/labels';
import { CatTile, Ring } from '../ui/visuals';
import { NotFound } from './NotFound';

const DAY = 86_400_000;

function dueText(p: SkillProgress, now: number): string {
  if (p.total === 0) return 'Not practised yet';
  const days = Math.ceil((p.dueAt - now) / DAY);
  if (days <= 0) return 'Due for review now';
  return days === 1 ? 'Next review tomorrow' : 'Next review in ' + days + ' days';
}

function levelText(p: SkillProgress): string {
  if (isMastered(p)) return 'Mastered';
  if (p.box >= 4) return 'Nearly there';
  if (p.box >= 2) return 'Getting there';
  return 'Just started';
}

export function SkillDetail({ id }: { id: string }) {
  const data = useData();
  if (!hasSkill(id)) return <NotFound />;
  const skill = getSkill(id);
  const status = statusOf(data, skill);
  const p = data.skills[id];
  const acc = p ? recentAccuracy(p) : null;
  const now = Date.now();
  const missing = skill.prereqs.map(getSkill).filter((s) => !(s.id in data.skills));

  return (
    <main className={'screen cat-' + skill.category}>
      <TopBar onBack={() => go('/skills')} backLabel="Back to Learn" />
      <div className="screen-body">
        <div className="skill-hero">
          <CatTile category={skill.category} size={56} />
          <div className="row-main">
            <p className="eyebrow" style={{ color: 'var(--cat)' }}>
              {CATEGORY_LABELS[skill.category]}
            </p>
            <h1 className="title-xl">{skill.title}</h1>
          </div>
        </div>
        <p className="lead muted">{skill.blurb}</p>

        {p && (
          <>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <Ring value={mastery(p)} size={84} stroke={8} color="var(--cat)" label="Mastery">
                <span style={{ fontSize: '1.15rem' }}>{Math.round(mastery(p) * 100)}%</span>
              </Ring>
              <div className="row-main">
                <p className="eyebrow">Mastery</p>
                <p className="row-title" style={{ fontSize: '1.2rem', marginTop: 2 }}>
                  {levelText(p)}
                </p>
                <p className="row-sub">Level {p.box} of 5</p>
                <p className="row-sub">{dueText(p, now)}</p>
              </div>
            </div>

            <div className="stat-grid">
              <div className="stat">
                <div className="stat-value">{acc === null ? '—' : Math.round(acc * 100) + '%'}</div>
                <div className="stat-label">Recent accuracy</div>
              </div>
              <div className="stat">
                <div className="stat-value">{seconds(averageMs(p))}</div>
                <div className="stat-label">Recent average</div>
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

            {p.recent.length > 0 && (
              <div className="card">
                <p className="row-title">Last {p.recent.length} answers</p>
                <p className="row-sub" style={{ marginBottom: 12 }}>
                  Taller bars took longer
                </p>
                <div className="attempts" role="img" aria-label={p.recent.filter((a) => a.ok).length + ' of ' + p.recent.length + ' right'}>
                  {p.recent.map((a, i) => {
                    const target = a.t ?? 10000;
                    const h = Math.max(0.15, Math.min(1, a.ms / (target * 2)));
                    return (
                      <span
                        key={i}
                        className={!a.ok ? 'is-miss' : a.hint ? 'is-hint' : ''}
                        style={{ height: h * 100 + '%' }}
                      />
                    );
                  })}
                </div>
                <div className="legend">
                  <span>
                    <i style={{ background: 'var(--good)' }} />
                    Right
                  </span>
                  <span>
                    <i style={{ background: 'var(--hint-text)' }} />
                    With hint
                  </span>
                  <span>
                    <i style={{ background: 'var(--bad)' }} />
                    Missed
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {status === 'locked' && missing.length > 0 && (
          <div className="list">
            <p className="eyebrow">Learn first</p>
            {missing.map((m) => (
              <button key={m.id} className="row" onClick={() => go('/skill/' + m.id)}>
                <CatTile category={m.category} size={36} />
                <div className="row-main">
                  <div className="row-title">{m.title}</div>
                  <div className="row-sub">{m.blurb}</div>
                </div>
                <Icon name="chevron" size={18} />
              </button>
            ))}
          </div>
        )}

        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 8 }}>
            The idea
          </p>
          {skill.lesson.idea.map((para, i) => (
            <p key={i} style={{ lineHeight: 1.55, marginTop: i ? 10 : 0 }}>
              {para}
            </p>
          ))}
        </div>
      </div>

      <div className="screen-actions sticky-actions">
        {status === 'learned' && (
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => go('/learn/' + id)}>
              Replay lesson
            </button>
            <button className="btn btn-primary" onClick={() => go('/practice/' + id)}>
              Practice
            </button>
          </div>
        )}
        {status === 'available' && (
          <button className="btn btn-primary" onClick={() => go('/learn/' + id)}>
            Start the lesson
          </button>
        )}
        {status === 'locked' && missing[0] && (
          <button className="btn btn-primary" onClick={() => go('/learn/' + (missing[0]?.id ?? ''))}>
            Learn {missing[0].title} first
          </button>
        )}
      </div>
    </main>
  );
}
