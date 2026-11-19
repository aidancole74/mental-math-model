import type { ReactNode } from 'react';
import type { Category } from '../skills/types';
import { go, type Route } from '../router';
import { Icon, type IconName } from './bits';
import { CATEGORY_LABELS } from './labels';

/** One glyph per category, drawn in its colour on its tint. Text, so no icon assets. */
export const CATEGORY_GLYPH: Record<Category, string> = {
  tricks: '✦',
  addsub: '±',
  percent: '%',
  multiply: '×',
  divide: '÷',
  estimate: '≈',
  extras: '★',
};

export function CatTile({ category, size = 40 }: { category: Category; size?: number }) {
  return (
    <span
      className={'cat-tile cat-' + category}
      style={{ width: size, height: size, fontSize: size * 0.48 }}
      aria-hidden
    >
      {CATEGORY_GLYPH[category]}
    </span>
  );
}

export function CatChip({ category, label }: { category: Category; label?: string }) {
  return (
    <span className={'cat-chip cat-' + category}>
      <CatTile category={category} size={22} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label ?? CATEGORY_LABELS[category]}
      </span>
    </span>
  );
}

/** A progress ring. `value` is 0..1; children sit in the middle. */
export function Ring({
  value,
  size = 44,
  stroke = 5,
  color,
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  /** Any CSS colour; defaults to the primary colour. */
  color?: string;
  label?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <span
      className="ring"
      style={{ width: size, height: size, ...(color ? ({ '--ring': color } as React.CSSProperties) : {}) }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} aria-hidden>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        {v > 0 && (
          <circle
            className="ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - v)}
          />
        )}
      </svg>
      <span className="ring-label">{children}</span>
    </span>
  );
}

// ------------------------------------------------------------------ menu bar

export type Tab = 'home' | 'learn' | 'progress' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName; path: string }[] = [
  { id: 'home', label: 'Home', icon: 'home', path: '/' },
  { id: 'learn', label: 'Learn', icon: 'book', path: '/skills' },
  { id: 'progress', label: 'Progress', icon: 'chart', path: '/progress' },
  { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
];

/** Which tab a route belongs to; null for focused flows (lessons, sessions...) that hide the bar. */
export function tabFor(route: Route): Tab | null {
  switch (route.name) {
    case 'home':
      return 'home';
    case 'skills':
    case 'skill':
      return 'learn';
    case 'progress':
    case 'mistakes':
      return 'progress';
    case 'settings':
      return 'settings';
    default:
      return null;
  }
}

export function TabBar({ active, badges = {} }: { active: Tab; badges?: Partial<Record<Tab, number>> }) {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="tab"
            aria-current={t.id === active ? 'page' : undefined}
            onClick={() => go(t.path, { replace: t.id === active })}
          >
            <Icon name={t.icon} size={24} />
            {t.label}
            {(badges[t.id] ?? 0) > 0 && (
              <span className="tab-badge" aria-label={badges[t.id] + ' to review'}>
                {badges[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** Big title for the top of a tab screen, with an optional slot on the right. */
export function PageHead({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {right}
    </header>
  );
}
