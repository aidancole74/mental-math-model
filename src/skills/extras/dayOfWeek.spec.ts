import { describe, expect, it } from 'vitest';
import { dayPlan, daysIn } from './dayOfWeek';

describe('dayPlan', () => {
  it('gets every date from 1800 to 2099 right', () => {
    let checked = 0;
    for (let y = 1800; y <= 2099; y++) {
      for (let m = 1; m <= 12; m++) {
        expect(daysIn(y, m), y + '-' + m).toBe(new Date(Date.UTC(y, m, 0)).getUTCDate());
        for (let d = 1; d <= daysIn(y, m); d++) {
          const truth = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
          if (dayPlan(y, m, d).day !== truth) expect(dayPlan(y, m, d).day, y + '-' + m + '-' + d).toBe(truth);
          checked++;
        }
      }
    }
    expect(checked).toBe(109573);
  });

  it('works the lesson example', () => {
    expect(dayPlan(1987, 3, 14)).toMatchObject({ yearCode: 3, century: 0, month: 3, total: 20, day: 6 });
  });

  it('keeps month codes between 0 and 6 after the leap-year adjustment', () => {
    expect(dayPlan(2024, 1, 1).month).toBe(6);
    expect(dayPlan(2024, 2, 1).month).toBe(2);
  });
});
