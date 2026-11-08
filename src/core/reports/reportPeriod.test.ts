import { describe, expect, it } from 'vitest';

import { addDays, lastDays, periodProblem, reportInstants } from './reportPeriod';

const WEEK = 7;

describe('reportPeriod', () => {
  it('turns two inclusive days into Bogota midnights with an exclusive end', () => {
    expect(reportInstants('2026-11-01', '2026-11-07')).toEqual({
      from: '2026-11-01T00:00:00-05:00',
      to: '2026-11-08T00:00:00-05:00',
    });
    expect(reportInstants('', '2026-11-07')).toBeNull();
  });

  it('adds days across a month', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(lastDays('2026-11-08', WEEK)).toEqual({ from: '2026-11-02', to: '2026-11-08' });
  });

  it('names the problem of a period', () => {
    expect(periodProblem('', '2026-11-07')).toBe('incomplete');
    expect(periodProblem('2026-11-08', '2026-11-07')).toBe('inverted');
    expect(periodProblem('2026-01-01', '2026-11-07')).toBe('tooLong');
    expect(periodProblem('2026-10-09', '2026-11-07')).toBeNull();
  });
});
