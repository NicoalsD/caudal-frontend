import { describe, expect, it } from 'vitest';

import { formatServiceDate } from './serviceDate';

describe('formatServiceDate', () => {
  it('keeps the calendar day: the first of October is not shown as the last of September', () => {
    expect(formatServiceDate('2026-10-01')).toMatch(/1 de octubre/);
    expect(formatServiceDate('2026-10-01')).not.toMatch(/30|septiembre/);
  });

  it('names the weekday in Spanish', () => {
    expect(formatServiceDate('2026-10-10')).toMatch(/^[a-záéíóú]+, 10 de octubre$/);
  });

  it('rejects text that is not YYYY-MM-DD', () => {
    expect(() => formatServiceDate('10/10/2026')).toThrow(RangeError);
  });

  it('rejects a day that does not exist', () => {
    expect(() => formatServiceDate('2026-02-30')).toThrow(RangeError);
  });
});
