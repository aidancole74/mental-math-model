import { useRef, useState } from 'react';
import { withSettings } from '../engine/progress';
import { go } from '../router';
import { backupFilename, fromBackup, saveBackupFile, toBackup } from '../storage/backup';
import { emptyData, type AppData, type SessionKind, type Theme } from '../storage/schema';
import { getData, replaceData, updateData, useData } from '../storage/store';
import { SKILLS } from '../skills/registry';
import { Segmented } from '../ui/bits';
import { PageHead } from '../ui/visuals';

type Notice = { kind: 'good' | 'error'; text: string } | null;

export function Settings() {
  const { settings } = useData();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ data: AppData; exportedAt: string | null } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const onExport = async (): Promise<void> => {
    const now = Date.now();
    try {
      await saveBackupFile(toBackup(getData(), now), backupFilename(now));
      setNotice({ kind: 'good', text: 'Backup saved.' });
    } catch {
      // Cancelling the share sheet lands here too; nothing to report.
    }
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    setNotice(null);
    setConfirmReset(false);
    if (!file) return;
    const parsed = fromBackup(await file.text());
    if (parsed.ok) setPendingImport({ data: parsed.data, exportedAt: parsed.exportedAt });
    else setNotice({ kind: 'error', text: parsed.error });
    if (fileInput.current) fileInput.current.value = '';
  };

  const applyImport = (): void => {
    if (!pendingImport) return;
    replaceData(pendingImport.data);
    setPendingImport(null);
    setNotice({ kind: 'good', text: 'Backup restored.' });
  };

  const reset = (): void => {
    replaceData({ ...emptyData(), settings: getData().settings });
    setConfirmReset(false);
    setNotice({ kind: 'good', text: 'Progress erased. Settings kept.' });
  };

  return (
    <main className="screen">
      <div className="screen-body" style={{ gap: 20 }}>
        <PageHead title="Settings" />
        <p className="eyebrow section-head">Practice</p>
        <div className="settings-group">
          <div className="setting">
            <span className="setting-label">Quick practice length</span>
            <Segmented<SessionKind>
              label="Quick practice length"
              value={settings.sessionKind}
              options={[
                { value: 'count', label: '10 problems' },
                { value: 'time', label: '2 minutes' },
              ]}
              onChange={(v) => updateData((d) => withSettings(d, { sessionKind: v }))}
            />
          </div>

          <div className="setting">
            <span className="setting-label">Timer</span>
            <Segmented<'relaxed' | 'challenge'>
              label="Timer"
              value={settings.challenge ? 'challenge' : 'relaxed'}
              options={[
                { value: 'relaxed', label: 'Relaxed' },
                { value: 'challenge', label: 'Challenge' },
              ]}
              onChange={(v) => updateData((d) => withSettings(d, { challenge: v === 'challenge' }))}
            />
            <span className="setting-help">
              {settings.challenge
                ? 'Each problem has a countdown. Running out counts as a miss.'
                : 'No clock on screen. Your speed is still tracked quietly.'}
            </span>
          </div>
        </div>

        <p className="eyebrow section-head">Appearance</p>
        <div className="settings-group">
          <div className="setting">
            <span className="setting-label">Theme</span>
            <Segmented<Theme>
              label="Appearance"
              value={settings.theme}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              onChange={(v) => updateData((d) => withSettings(d, { theme: v }))}
            />
          </div>
        </div>

        <p className="eyebrow section-head">Your data</p>
        <div className="settings-group">
          <div className="setting">
            <span className="setting-label">Backup</span>
            <span className="setting-help">
              Your progress lives only on this device. Save a backup file to move it or keep it safe.
            </span>
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => void onExport()}>
                Export
              </button>
              <button className="btn btn-secondary" onClick={() => fileInput.current?.click()}>
                Import
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            {pendingImport && (
              <div className="notice">
                <p>
                  Replace everything on this device with this backup
                  {pendingImport.exportedAt ? ' from ' + new Date(pendingImport.exportedAt).toLocaleDateString() : ''}?
                  It has {Object.keys(pendingImport.data.skills).length} learned skills and{' '}
                  {pendingImport.data.sessions.length} sessions.
                </p>
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={() => setPendingImport(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={applyImport}>
                    Replace
                  </button>
                </div>
              </div>
            )}
            {notice && <p className={'notice ' + (notice.kind === 'good' ? 'is-good' : 'is-error')}>{notice.text}</p>}
          </div>

          <div className="setting">
            <span className="setting-label">Placement quiz</span>
            <span className="setting-help">Skip lessons for tricks you already know.</span>
            <button className="btn btn-secondary" onClick={() => go('/placement')}>
              Take the placement quiz
            </button>
          </div>

          <div className="setting">
            {!confirmReset ? (
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--bad)' }}
                onClick={() => {
                  setConfirmReset(true);
                  setPendingImport(null);
                  setNotice(null);
                }}
              >
                Erase all progress
              </button>
            ) : (
              <div className="notice is-error">
                <p>
                  This erases every lesson, score and streak on this device. Export a backup first if you might want it
                  back.
                </p>
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={() => setConfirmReset(false)}>
                    Keep it
                  </button>
                  <button className="btn btn-danger-solid" onClick={reset}>
                    Erase
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="about">
          Quick Mental Math · {SKILLS.length} skills
          <br />
          Works offline. Nothing leaves this device.
        </p>
      </div>
    </main>
  );
}
