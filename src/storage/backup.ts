import { validate, type AppData } from './schema';

const APP_ID = 'quick-mental-math';

interface BackupFile {
  app: typeof APP_ID;
  exportedAt: string;
  data: AppData;
}

export function toBackup(data: AppData, now: number): string {
  const file: BackupFile = { app: APP_ID, exportedAt: new Date(now).toISOString(), data };
  return JSON.stringify(file, null, 2);
}

export function backupFilename(now: number): string {
  return APP_ID + '-backup-' + new Date(now).toISOString().slice(0, 10) + '.json';
}

export type ParsedBackup =
  | { ok: true; data: AppData; exportedAt: string | null }
  | { ok: false; error: string };

/** Accepts our backup envelope, or a bare AppData blob. Never throws. */
export function fromBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file isn’t a backup — it couldn’t be read as JSON.' };
  }
  const envelope = typeof raw === 'object' && raw !== null && (raw as { app?: unknown }).app === APP_ID;
  const payload = envelope ? (raw as { data?: unknown }).data : raw;
  const data = validate(payload);
  if (!data) return { ok: false, error: 'That file isn’t a Quick Mental Math backup.' };
  const exportedAt = envelope ? String((raw as { exportedAt?: unknown }).exportedAt ?? '') || null : null;
  return { ok: true, data, exportedAt };
}

/**
 * Hands the backup to the user. In an installed iPhone app the download
 * attribute does nothing, so use the share sheet ("Save to Files") there.
 */
export async function saveBackupFile(text: string, filename: string): Promise<void> {
  const file = new File([text], filename, { type: 'application/json' });
  const standaloneIOS = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standaloneIOS && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
