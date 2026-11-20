import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { analyzeWindows, sameWindows, timeToMinutes } from './operatingWindows';
import type { OperatingWindow } from './ruleSetParts';

const window = (dayOfWeek: number | null, start: string, end: string): OperatingWindow => ({
  dayOfWeek,
  start,
  end,
});

const FIVE_AM = 300;
const LAST_MINUTE = 1439;
const SATURDAY = 6;
const SUNDAY = 7;
const MINUTES_IN_DAY = 1440;
const MINUTES_PER_HOUR = 60;
const TUESDAY = 2;
const PREVIOUS = -1;

describe('timeToMinutes', () => {
  it('reads HH:MM', () => {
    expect(timeToMinutes('05:00')).toBe(FIVE_AM);
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('23:59')).toBe(LAST_MINUTE);
  });

  it.each(['24:00', '5:00', '05:60', '0500', '', 'abc', '05:00:00', '-1:00'])(
    'rejects %j',
    (text) => {
      expect(timeToMinutes(text)).toBeNull();
    },
  );

  it('ignores spaces around the text', () => {
    expect(timeToMinutes(' 05:00 ')).toBe(FIVE_AM);
  });
});

describe('analyzeWindows', () => {
  it('accepts one window per day and several that do not cross', () => {
    const result = analyzeWindows([
      window(null, '05:00', '21:00'),
      window(SATURDAY, '06:00', '10:00'),
      window(SATURDAY, '14:00', '18:00'),
    ]);

    expect(result).toEqual({ inverted: [], overlapping: [] });
  });

  it('lets two windows touch without overlapping', () => {
    expect(
      analyzeWindows([window(1, '05:00', '08:00'), window(1, '08:00', '10:00')]).overlapping,
    ).toEqual([]);
  });

  it('finds windows of the same day that cross, whatever their order', () => {
    const result = analyzeWindows([
      window(1, '09:00', '12:00'),
      window(TUESDAY, '09:00', '12:00'),
      window(1, '05:00', '10:00'),
    ]);

    expect(result.overlapping).toEqual([0, TUESDAY]);
  });

  it('does not compare windows of different days or the every-day group with a day', () => {
    expect(
      analyzeWindows([window(null, '05:00', '21:00'), window(SUNDAY, '06:00', '12:00')])
        .overlapping,
    ).toEqual([]);
  });

  it('reports windows that end at or before their start', () => {
    expect(
      analyzeWindows([window(1, '10:00', '10:00'), window(1, '22:00', '02:00')]).inverted,
    ).toEqual([0, 1]);
  });

  it('skips windows with unreadable times: their own field reports them', () => {
    expect(analyzeWindows([window(1, 'xx', '10:00')])).toEqual({ inverted: [], overlapping: [] });
  });

  it('a list of back-to-back windows never reports an overlap (property)', () => {
    const pad = (value: number): string => String(value).padStart(TUESDAY, '0');
    const text = (minutes: number): string =>
      `${pad(Math.floor(minutes / MINUTES_PER_HOUR))}:${pad(minutes % MINUTES_PER_HOUR)}`;
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: MINUTES_IN_DAY - 1 }), { maxLength: 8 }),
        (cuts) => {
          const points = [0, ...[...cuts].sort((a, b) => a - b)];
          const windows = points
            .slice(0, PREVIOUS)
            .map((from, index) => window(1, text(from), text(points[index + 1] ?? from)));

          expect(analyzeWindows(windows)).toEqual({ inverted: [], overlapping: [] });
        },
      ),
    );
  });
});

describe('sameWindows', () => {
  it('ignores the order', () => {
    expect(
      sameWindows(
        [window(1, '05:00', '08:00'), window(null, '06:00', '07:00')],
        [window(null, '06:00', '07:00'), window(1, '05:00', '08:00')],
      ),
    ).toBe(true);
  });

  it('sees a different time, day or size', () => {
    const base = [window(1, '05:00', '08:00')];

    expect(sameWindows(base, [window(1, '05:00', '08:30')])).toBe(false);
    expect(sameWindows(base, [window(TUESDAY, '05:00', '08:00')])).toBe(false);
    expect(sameWindows(base, [])).toBe(false);
  });
});
