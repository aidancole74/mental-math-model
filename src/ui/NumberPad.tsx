import { Icon } from './bits';

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back' | 'enter';

const ROWS: PadKey[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'back'];

/** Apply a key to the current input. Pure, so it is easy to test. */
export function applyKey(input: string, key: PadKey, maxLength = 9, maxDecimals = 2): string {
  if (key === 'back') return input.slice(0, -1);
  if (key === 'enter') return input;
  if (key === '.') {
    if (input.includes('.')) return input;
    return input === '' ? '0.' : input + '.';
  }
  if (input.length >= maxLength) return input;
  // Two decimal places is enough for money; more is a typo. Fractions allow 3.
  const dot = input.indexOf('.');
  if (dot >= 0 && input.length - dot > maxDecimals) return input;
  if (input === '0') return key; // no leading zeros
  return input + key;
}

export function NumberPad({
  onKey,
  canSubmit,
  submitLabel = 'Check',
}: {
  onKey: (key: PadKey) => void;
  canSubmit: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="pad">
      {ROWS.map((k) => (
        <button
          key={k}
          className={'pad-key' + (k === 'back' || k === '.' ? ' is-fn' : '')}
          onClick={() => onKey(k)}
          aria-label={k === 'back' ? 'Delete' : k === '.' ? 'Decimal point' : k}
        >
          {k === 'back' ? <Icon name="backspace" size={28} /> : k}
        </button>
      ))}
      <button className="btn btn-primary pad-check" onClick={() => onKey('enter')} disabled={!canSubmit}>
        {submitLabel}
      </button>
    </div>
  );
}
