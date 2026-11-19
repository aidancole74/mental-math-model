import { useEffect } from 'react';
import { go } from '../router';
import { getSkill, hasSkill } from '../skills/registry';
import { getLastSummary } from '../storage/store';
import { seconds } from '../ui/bits';

export function Summary() {
  const last = getLastSummary();

  useEffect(() => {
    if (!last) go('/', { replace: true });
  }, [last]);

  if (!last) return null;
  const { summary, focus } = last;
  const pct = Math.round(summary.accuracy * 100);
  const review = summary.review && hasSkill(summary.review.skillId) ? summary.review : null;
  const reviewSkill = review ? getSkill(review.skillId) : null;

  return (
    <main className="screen">
      <div className="screen-body">
        <div className="spacer" />
        <p className="eyebrow center">{pct === 100 ? 'Perfect round' : 'Session done'}</p>
        <p className="big-number">
          {summary.correct}
          <span className="muted" style={{ fontSize: '0.5em' }}>
            /{summary.n}
          </span>
        </p>

        <div className="stat-grid">
          <div className="stat">
            <div className="stat-value">{pct}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
          <div className="stat">
            <div className="stat-value">{seconds(summary.avgMs)}</div>
            <div className="stat-label">Avg per right answer</div>
          </div>
        </div>

        {reviewSkill && review && !focus && (
          <div className="card">
            <p className="eyebrow">One to review</p>
            <p className="row-title" style={{ marginTop: 6 }}>
              {reviewSkill.title}
            </p>
            <p className="row-sub">{review.reason}</p>
            <button
              className="btn btn-tonal"
              style={{ marginTop: 12 }}
              onClick={() => go('/practice/' + reviewSkill.id, { replace: true })}
            >
              Practice this one
            </button>
          </div>
        )}
        <div className="spacer" />
      </div>

      <div className="screen-actions">
        <button className="btn btn-primary" onClick={() => go('/', { replace: true })}>
          Done
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => go(focus ? '/practice/' + focus : '/practice', { replace: true })}
        >
          Another round
        </button>
      </div>
    </main>
  );
}
