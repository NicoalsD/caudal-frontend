import { describe, expect, it } from 'vitest';

import { periodError } from './minutesPeriod';

describe('periodError', () => {
  it('accepts a period whose end is the same day or later', () => {
    expect(periodError('2026-10-01', '2026-10-01')).toBeNull();
    expect(periodError('2026-10-01', '2026-10-31')).toBeNull();
  });

  it('asks for both days', () => {
    expect(periodError('', '2026-10-31')).toBe('PERIOD_REQUIRED');
    expect(periodError('2026-10-01', '')).toBe('PERIOD_REQUIRED');
  });

  it('refuses an end before the start', () => {
    expect(periodError('2026-10-31', '2026-10-01')).toBe('PERIOD_REVERSED');
  });
});
