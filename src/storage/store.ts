/**
 * The app's single source of truth: AppData in memory, persisted on every
 * change. Components read it with useData(); changes go through updateData()
 * with one of the pure functions from engine/progress.ts.
 */

import { useSyncExternalStore } from 'react';
import type { Summary } from '../engine/session';
import { browserKV, loadData, saveData } from './db';
import type { AppData } from './schema';

const kv = browserKV();
let data: AppData = loadData(kv);
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getData(): AppData {
  return data;
}

export function updateData(change: (current: AppData) => AppData): void {
  const next = change(data);
  if (next === data) return;
  data = next;
  saveData(kv, data);
  listeners.forEach((l) => l());
}

/** Replaces everything — used by backup import. */
export function replaceData(next: AppData): void {
  updateData(() => next);
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData);
}

/**
 * The just-finished session's summary. Deliberately not persisted: it only
 * feeds the summary screen, and the session itself is already saved.
 */
let lastSummary: { summary: Summary; focus: string | null } | null = null;

export function setLastSummary(value: typeof lastSummary): void {
  lastSummary = value;
}

export function getLastSummary(): typeof lastSummary {
  return lastSummary;
}
