import { describe, expect, it } from 'vitest';

import { plain } from '../../test/text';

import { formatDate, formatDateTime, formatTime, parseInstant, toBogotaDateKey } from './time';

const UTC_MORNING = '2026-10-09T13:00:00Z';
const BOGOTA_MORNING = '2026-10-09T08:00:00-05:00';

describe('Bogota time formatting', () => {
  it('shows the same wall clock for the same instant, written in UTC or with an offset', () => {
    expect(plain(formatTime(UTC_MORNING))).toBe('8:00 a. m.');
    expect(plain(formatTime(BOGOTA_MORNING))).toBe('8:00 a. m.');
  });

  it('formats date and date with time', () => {
    expect(plain(formatDate(UTC_MORNING))).toBe('9 de oct de 2026');
    expect(plain(formatDateTime(UTC_MORNING))).toBe('9 de oct de 2026, 8:00 a. m.');
  });

  it('moves to the previous day when UTC is already the next one', () => {
    // 03:30 UTC on the 10th is 22:30 on the 9th in Bogota (UTC-5, no daylight saving).
    expect(toBogotaDateKey('2026-10-10T03:30:00Z')).toBe('2026-10-09');
    expect(plain(formatDateTime('2026-10-10T03:30:00Z'))).toBe('9 de oct de 2026, 10:30 p. m.');
  });

  it('keeps the service day at the Bogota midnight boundary', () => {
    expect(toBogotaDateKey('2026-10-10T04:59:59Z')).toBe('2026-10-09');
    expect(toBogotaDateKey('2026-10-10T05:00:00Z')).toBe('2026-10-10');
  });
});

describe('parseInstant', () => {
  it('returns a Date for a valid ISO string', () => {
    expect(parseInstant(UTC_MORNING).getTime()).toBe(parseInstant(BOGOTA_MORNING).getTime());
  });

  it.each(['', 'ayer', '2026-13-45T00:00:00Z'])('rejects %j', (value) => {
    expect(() => parseInstant(value)).toThrow(RangeError);
  });
});
