import { useEffect, useMemo } from 'react';
import { formatAnswer, formatGiven } from '../engine/grading';
import { longestRun } from '../engine/stats';
import { go } from '../router';
import { getSkill, hasSkill, problemFromId } from '../skills/registry';
import type { Problem } from '../skills/types';
import { getLastSummary } from '../storage/store';
import { Icon, seconds } from '../ui/bits';
import { Ring } from '../ui/visuals';

function headline(pct: number): string {
  if (pct === 100) return 'Perfect round';
  if (pct >= 80) return 'Nice work';
  if (pct >= 50) return 'Good practice';
  return 'Keep at it';
}

export function Summary() {
  const last = getLastSummary();

  useEffect(() => {
    if (!last) go('/', { replace: true });
  }, [last]);

  // Rebuild each problem from its id for the recap (ids are replayable).
  const recap = useMemo(
    () =>
      (last?.results ?? []).flatMap((r) => {
        try {
          return [{ r, problem: problemFromId(r.problemId) as Problem }];
        } catch {
          return [];
        }
      }),
    [last],
  );

  if (!last) return null;
  const { summary, focus, prevBestMs } = last;
  const pct = Math.round(summary.accuracy * 100);
  const review = summary.review && hasSkill(summary.review.skillId) ? summary.review : null;
  const reviewSkill = review ? getSkill(review.skillId) : null;
  const run = longestRun(last.results.map((r) => r.ok));
  const newBest =
    !focus && summary.n >= 5 && summary.avgMs !== null && prevBestMs !== null && summary.avgMs < prevBestMs;

  return (
    <main className="screen">
      <div className="screen-body">
        <div className="summary-hero">
          <Ring
            value={summary.accuracy}
            size={132}
            stroke={11}
            color={pct >= 80 ? 'var(--good)' : pct >= 50 ? 'var(--primary)' : 'var(--bad)'}
            label={summary.correct + ' of ' + summary.n + ' right'}
          >
            <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>
              {summary.correct}
              <span className="muted" style={{ fontSize: '0.55em' }}>
                /{summary.n}
              </span>
            </span>
          </Ring>
          <p className="summary-title">{headline(pct)}</p>
        </div>

        {newBest && (
          <div className="callout">
            <Icon name="trophy" size={24} />
            <span>
              New personal best: {seconds(summary.avgMs)} per answer (was {seconds(prevBestMs)})
            </span>
          </div>
        )}

        <div className="mini-stats">
          <div className="mini-stat" style={{ cursor: 'default' }}>
            <div className="stat-value">{pct}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
          <div className="mini-stat" style={{ cursor: 'default' }}>
            <div className="stat-value">{seconds(summary.avgMs)}</div>
            <div className="stat-label">Avg right</div>
          </div>
          <div className="mini-stat" style={{ cursor: 'default' }}>
            <div className="stat-value">{run}</div>
            <div className="stat-label">Best run</div>
          </div>
        </div>

        {reviewSkill && review && !focus && summary.correct < summary.n && (
          <button className="row" onClick={() => go('/practice/' + reviewSkill.id, { replace: true })}>
            <div className="row-main">
              <p className="eyebrow">One to review</p>
              <p className="row-title" style={{ marginTop: 4 }}>
                {reviewSkill.title}
              </p>
              <p className="row-sub">{review.reason} · tap to practise it</p>
            </div>
            <Icon name="chevron" size={18} />
          </button>
        )}

        {recap.length > 0 && (
          <div className="card">
            <p className="row-title" style={{ marginBottom: 4 }}>
              Problem by problem
            </p>
            <div className="recap">
              {recap.map(({ r, problem }, i) => (
                <div key={i} className={'recap-row' + (r.ok ? '' : ' is-wrong')}>
                  <span className="recap-mark" aria-label={r.ok ? 'Right' : 'Missed'}>
                    <Icon name={r.ok ? 'check' : 'x'} size={14} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="recap-prompt">{problem.prompt}</div>
                    <div className="recap-detail">
                      {r.ok ? (
                        formatAnswer(problem)
                      ) : (
                        <>
                          {r.given ? <s>{formatGiven(problem, r.given)}</s> : 'Time ran out'} → {formatAnswer(problem)}
                        </>
                      )}
                      {r.hint && ' · hint'}
                    </div>
                  </div>
                  <span className="recap-time">{seconds(r.ms)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="screen-actions">
        <div className="btn-row">
          <button
            className="btn btn-secondary"
            onClick={() => go(focus ? '/practice/' + focus : '/practice', { replace: true })}
          >
            <Icon name="refresh" size={20} /> Again
          </button>
          <button className="btn btn-primary" onClick={() => go('/', { replace: true })}>
            Done
          </button>
        </div>
      </div>
    </main>
  );
}
