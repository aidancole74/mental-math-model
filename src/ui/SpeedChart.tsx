import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { SessionRecord } from '../storage/schema';

/**
 * Average seconds per right answer, one point per session.
 * Single series: no legend (the card title names it); the latest value is
 * direct-labelled; crosshair + tooltip on hover/touch/arrow keys; table view.
 */

/** Top padding leaves a band for the tooltip, so it never covers the card title. */
const H = 196;
const PAD = { top: 44, right: 44, bottom: 26, left: 40 };

interface Point {
  at: number;
  s: number;
  n: number;
  correct: number;
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** A clean axis maximum: 1, 2, 5, 10, 15, 20, 30, 60 ... seconds. */
export function niceMax(v: number): number {
  const steps = [2, 4, 6, 8, 10, 12, 15, 20, 30, 45, 60, 90, 120];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 60) * 60;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const fmtS = (s: number): string => s.toFixed(s < 10 ? 1 : 0) + ' s';

export function SpeedChart({ sessions }: { sessions: SessionRecord[] }) {
  const points: Point[] = sessions
    .filter((r) => r.avgMs !== null)
    .slice(-30)
    .map((r) => ({ at: r.at, s: (r.avgMs as number) / 1000, n: r.n, correct: r.correct }));
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipW, setTipW] = useState(0);
  useLayoutEffect(() => {
    if (tipRef.current) setTipW(tipRef.current.offsetWidth);
  }, [active]);

  if (points.length < 2) {
    return <p className="muted">Finish two sessions to see your trend here.</p>;
  }

  const max = niceMax(Math.max(...points.map((p) => p.s)));
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number): number => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (s: number): number => PAD.top + innerH - (s / max) * innerH;
  const ticks = [0, max / 2, max];
  const path = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.s).toFixed(1)).join(' ');
  const last = points[points.length - 1] as Point;
  const lastI = points.length - 1;

  const nearest = (clientX: number, rect: DOMRect): number => {
    const rel = clientX - rect.left - PAD.left;
    return Math.max(0, Math.min(lastI, Math.round((rel / innerW) * lastI)));
  };
  const onPointer = (e: PointerEvent<SVGSVGElement>): void => {
    setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>): void => {
    if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? lastI) - 1));
    else if (e.key === 'ArrowRight') setActive((a) => Math.min(lastI, (a ?? lastI) + 1));
    else if (e.key === 'Escape') setActive(null);
    else return;
    e.preventDefault();
  };

  const a = active === null ? null : (points[active] as Point);
  // Centre on the crosshair, but never past either edge of the chart.
  const tipLeft = active === null ? 0 : Math.max(0, Math.min(x(active) - tipW / 2, width - tipW));

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={
          'Average time per right answer over your last ' + points.length + ' sessions. Latest ' + fmtS(last.s) + '.'
        }
        tabIndex={0}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} />
            <text className="chart-tick" x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {(t % 1 ? t.toFixed(1) : t) + (t === max ? ' s' : '')}
            </text>
          </g>
        ))}
        <text className="chart-tick" x={PAD.left} y={H - 6} textAnchor="start">
          {dateFmt.format(points[0]?.at)}
        </text>
        <text className="chart-tick" x={PAD.left + innerW} y={H - 6} textAnchor="end">
          {dateFmt.format(last.at)}
        </text>

        <path className="chart-line" d={path} />

        {/* Latest value: end dot (surface ring) + direct label */}
        <circle className="chart-dot" cx={x(lastI)} cy={y(last.s)} r={4} />
        <text className="chart-label" x={x(lastI) + 8} y={y(last.s)} dy="0.32em">
          {fmtS(last.s)}
        </text>

        {a && active !== null && (
          <g pointerEvents="none">
            <line className="chart-cross" x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} />
            <circle className="chart-dot" cx={x(active)} cy={y(a.s)} r={5} />
          </g>
        )}
      </svg>

      {a && (
        <div className="chart-tip" ref={tipRef} style={{ left: tipLeft }} role="status">
          <span className="chart-tip-key" />
          <strong>{fmtS(a.s)}</strong>
          <span>
            {dateFmt.format(a.at)} · {a.correct}/{a.n} right
          </span>
        </div>
      )}

      <details className="chart-table">
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Session</th>
              <th scope="col">Avg per right answer</th>
              <th scope="col">Right</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.at}>
                <td>{dateFmt.format(p.at)}</td>
                <td>{fmtS(p.s)}</td>
                <td>
                  {p.correct}/{p.n}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
