import type { ReactNode } from 'react';
import type { Step } from '../skills/types';

/** A few inline icons — cheaper than an icon library. */
export function Icon({ name, size = 24 }: { name: 'close' | 'back' | 'lock' | 'check' | 'backspace' | 'settings' | 'list' | 'flame'; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'close':
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'back':
      return <svg {...common}><path d="M15 5l-7 7 7 7" /></svg>;
    case 'lock':
      return <svg {...common}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
    case 'check':
      return <svg {...common}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
    case 'backspace':
      return <svg {...common}><path d="M9 5h11v14H9l-6-7z" /><path d="M13 9.5l5 5M18 9.5l-5 5" /></svg>;
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
    case 'list':
      return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>;
    case 'flame':
      return <svg {...common}><path d="M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-10-2 2-3 4-3 6-1-1-2-2.5-2-4-2.5 2-5 5.2-5 8 0 4.3 3 7 7 7z" /></svg>;
  }
}

/** Top bar: one way out on the left, an optional title, an optional slot on the right. */
export function TopBar({
  onBack,
  backIcon = 'back',
  backLabel = 'Back',
  title,
  right,
}: {
  onBack?: () => void;
  backIcon?: 'back' | 'close';
  backLabel?: string;
  title?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label={backLabel}>
          <Icon name={backIcon} />
        </button>
      ) : (
        <span className="topbar-spacer" />
      )}
      <div className="topbar-title">{title}</div>
      {right ?? <span className="topbar-spacer" />}
    </header>
  );
}

export function Bar({ value, urgent = false, label }: { value: number; urgent?: boolean; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className={'bar' + (urgent ? ' is-urgent' : '')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <span style={{ width: pct + '%' }} />
    </div>
  );
}

/** A step-by-step walkthrough. Pass `shown` to reveal it progressively. */
export function Steps({ steps, shown }: { steps: Step[]; shown?: number }) {
  return (
    <ol className="steps">
      {steps.slice(0, shown ?? steps.length).map((s, i) => (
        <li key={i}>
          <span>
            {s.text}
            {s.detail && <span className="step-detail">{s.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Problem text: big for "11 × 43", smaller for a word problem. */
export function ProblemText({ text }: { text: string }) {
  return <p className={'problem' + (text.length > 16 ? ' is-long' : '')}>{text}</p>;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** "4.2 s" */
export function seconds(ms: number | null): string {
  if (ms === null) return '—';
  return (ms / 1000).toFixed(ms < 10000 ? 1 : 0) + ' s';
}
