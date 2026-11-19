import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

describe('parseRoute', () => {
  it('maps hashes to screens', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
    expect(parseRoute('#/learn/x11')).toEqual({ name: 'learn', id: 'x11' });
    expect(parseRoute('#/practice')).toEqual({ name: 'practice', focus: null });
    expect(parseRoute('#/practice/ltr-add')).toEqual({ name: 'practice', focus: 'ltr-add' });
    expect(parseRoute('#/skill/square-5')).toEqual({ name: 'skill', id: 'square-5' });
    expect(parseRoute('#/settings')).toEqual({ name: 'settings' });
    expect(parseRoute('#/progress')).toEqual({ name: 'progress' });
    expect(parseRoute('#/mistakes')).toEqual({ name: 'mistakes' });
    expect(parseRoute('#/mistakes/retry')).toEqual({ name: 'mistakes-retry' });
    expect(parseRoute('#/placement')).toEqual({ name: 'placement' });
  });

  it('falls back to home for anything unknown', () => {
    expect(parseRoute('#/nope')).toEqual({ name: 'home' });
    expect(parseRoute('#/learn')).toEqual({ name: 'home' });
  });
});
