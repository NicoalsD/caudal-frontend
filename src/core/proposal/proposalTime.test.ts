import { describe, expect, it } from 'vitest';

import type { OperatingWindow } from '../rules/ruleSetParts';
import { bogotaMinutesOf, isoWeekday, toBogotaIso, windowsForDay } from './proposalTime';

const MINUTES_PER_HOUR = 60;
const HALF_HOUR_MINUTES = 30;
const SUNDAY = 7;
const MONDAY = 1;
const SATURDAY = 6;
const FRIDAY = 5;
const SIX = 6;
const EIGHT = 8;
const FIVE = 5;
const TWENTY_ONE = 21;
const MORNING_SIX = SIX * MINUTES_PER_HOUR;
const MORNING_EIGHT_THIRTY = EIGHT * MINUTES_PER_HOUR + HALF_HOUR_MINUTES;
const NIGHT_NINE_THIRTY = TWENTY_ONE * MINUTES_PER_HOUR + HALF_HOUR_MINUTES;
const DAWN_FIVE = FIVE * MINUTES_PER_HOUR;
const NIGHT_NINE = TWENTY_ONE * MINUTES_PER_HOUR;

describe('proposalTime', () => {
  it('gives the ISO weekday, with Sunday as 7', () => {
    expect(isoWeekday('2026-10-04')).toBe(SUNDAY);
    expect(isoWeekday('2026-10-05')).toBe(MONDAY);
    expect(isoWeekday('2026-10-09')).toBe(FRIDAY);
  });

  it('rejects a text that is not a service day', () => {
    expect(() => isoWeekday('09/10/2026')).toThrow(RangeError);
  });

  it('writes a Bogota instant from minutes after midnight', () => {
    expect(toBogotaIso('2026-10-09', MORNING_SIX)).toBe('2026-10-09T06:00:00-05:00');
    expect(toBogotaIso('2026-10-09', MORNING_EIGHT_THIRTY)).toBe('2026-10-09T08:30:00-05:00');
  });

  it('reads the minutes of the Bogota day from an instant, whatever its offset', () => {
    expect(bogotaMinutesOf('2026-10-09T06:00:00-05:00')).toBe(MORNING_SIX);
    expect(bogotaMinutesOf('2026-10-09T11:00:00Z')).toBe(MORNING_SIX);
    expect(bogotaMinutesOf('2026-10-09T02:30:00Z')).toBe(NIGHT_NINE_THIRTY);
  });

  it('rejects an instant that cannot be read', () => {
    expect(() => bogotaMinutesOf('no es fecha')).toThrow(RangeError);
  });

  it('keeps the windows of the day and those of every day, and drops the broken ones', () => {
    const windows: OperatingWindow[] = [
      { dayOfWeek: null, start: '05:00', end: '21:00' },
      { dayOfWeek: MONDAY, start: '05:00', end: '12:00' },
      { dayOfWeek: SATURDAY, start: '05:00', end: '12:00' },
      { dayOfWeek: null, start: '21:00', end: '05:00' },
      { dayOfWeek: null, start: 'x', end: '05:00' },
    ];
    expect(windowsForDay(windows, '2026-10-09')).toEqual([
      { startMinutes: DAWN_FIVE, endMinutes: NIGHT_NINE },
    ]);
  });
});
