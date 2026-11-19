import { emptyData, validate, type AppData } from './schema';

/** The bit of the Storage API we use, so tests can pass an in-memory fake. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'qmm.data.v1';

/**
 * Loads saved data. Never throws and never silently destroys progress:
 * if the stored blob is unreadable, it is copied aside under a
 * "qmm.corrupt.<time>" key before starting fresh.
 */
export function loadData(kv: KV, now: number = Date.now()): AppData {
  let raw: string | null = null;
  try {
    raw = kv.getItem(STORAGE_KEY);
  } catch {
    return emptyData();
  }
  if (raw === null) return emptyData();

  try {
    const data = validate(JSON.parse(raw));
    if (data) return data;
  } catch {
    // fall through to quarantine
  }
  try {
    kv.setItem('qmm.corrupt.' + now, raw);
  } catch {
    // storage full or blocked: nothing more we can do
  }
  return emptyData();
}

/** Returns false if the write failed (private mode, quota, ...). */
export function saveData(kv: KV, data: AppData): boolean {
  try {
    kv.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** localStorage when the browser allows it, otherwise a memory-only stand-in. */
export function browserKV(): KV {
  try {
    const probe = '__qmm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
  }
}
