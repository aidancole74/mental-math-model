import { describe, expect, it } from 'vitest';
import { applyKey, type PadKey } from './NumberPad';

const type = (keys: PadKey[]): string => keys.reduce((s, k) => applyKey(s, k), '');

describe('number pad input', () => {
  it('types digits and deletes', () => {
    expect(type(['4', '7', '3'])).toBe('473');
    expect(type(['4', '7', '3', 'back'])).toBe('47');
    expect(type(['back'])).toBe('');
  });

  it('allows one decimal point and starts bare points with 0', () => {
    expect(type(['9', '.', '6'])).toBe('9.6');
    expect(type(['9', '.', '.', '6'])).toBe('9.6');
    expect(type(['.', '5'])).toBe('0.5');
  });

  it('stops at two decimal places', () => {
    expect(type(['9', '.', '6', '0', '1'])).toBe('9.60');
  });

  it('allows more decimal places when the problem asks for them', () => {
    const typed = (['0', '.', '3', '7', '5', '1'] as PadKey[]).reduce((s, k) => applyKey(s, k, 9, 3), '');
    expect(typed).toBe('0.375');
  });

  it('drops leading zeros', () => {
    expect(type(['0', '0', '7'])).toBe('7');
    expect(type(['0', '.', '7'])).toBe('0.7');
  });

  it('caps the length', () => {
    expect(type(Array.from({ length: 20 }, () => '9' as PadKey))).toHaveLength(9);
  });
});
