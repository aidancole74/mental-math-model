/**
 * A tiny hash router. Hash URLs need no server rewrites, which keeps the PWA
 * working offline and on any static host.
 */

import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'learn'; id: string }
  | { name: 'practice'; focus: string | null }
  | { name: 'summary' }
  | { name: 'skills' }
  | { name: 'skill'; id: string }
  | { name: 'settings' }
  | { name: 'progress' }
  | { name: 'mistakes' }
  | { name: 'mistakes-retry' }
  | { name: 'placement' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [head, arg] = parts;
  switch (head) {
    case 'learn':
      return arg ? { name: 'learn', id: arg } : { name: 'home' };
    case 'practice':
      return { name: 'practice', focus: arg ?? null };
    case 'summary':
      return { name: 'summary' };
    case 'skills':
      return { name: 'skills' };
    case 'skill':
      return arg ? { name: 'skill', id: arg } : { name: 'skills' };
    case 'settings':
      return { name: 'settings' };
    case 'progress':
      return { name: 'progress' };
    case 'mistakes':
      return arg === 'retry' ? { name: 'mistakes-retry' } : { name: 'mistakes' };
    case 'placement':
      return { name: 'placement' };
    default:
      return { name: 'home' };
  }
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

const getHash = (): string => window.location.hash;

export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, getHash));
}

/** go('/learn/x11'). `replace` keeps throwaway screens (a finished session) out of history. */
export function go(path: string, opts: { replace?: boolean } = {}): void {
  const hash = '#' + path;
  if (opts.replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = path;
  }
  window.scrollTo(0, 0);
}
