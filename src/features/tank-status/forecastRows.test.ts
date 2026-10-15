import { describe, expect, it } from 'vitest';

import { toForecastRows } from './forecastRows';

const LOW_LEVEL = 1.8;
const HIGH_LEVEL = 2.5;

describe('toForecastRows', () => {
  it('puts the observed level before the forecast days, in day order', () => {
    const rows = toForecastRows({ dayKey: '2026-10-14', value: 2.3 }, [
      { dayKey: '2026-10-16', p10: 1.9, p50: 2.1, p90: 2.4 },
      { dayKey: '2026-10-15', p10: 1.8, p50: 2.2, p90: 2.5 },
    ]);

    expect(rows.map((row) => row.dayKey)).toEqual(['2026-10-14', '2026-10-15', '2026-10-16']);
    expect(rows[0]).toEqual({ dayKey: '2026-10-14', observed: 2.3 });
  });

  it('swaps a band whose p10 is above p90 and never draws a negative width', () => {
    const [row] = toForecastRows(null, [
      { dayKey: '2026-10-15', p10: HIGH_LEVEL, p50: 2.2, p90: LOW_LEVEL },
    ]);

    expect(row?.range).toEqual([LOW_LEVEL, HIGH_LEVEL]);
    expect(row?.p10).toBe(LOW_LEVEL);
    expect(row?.p90).toBe(HIGH_LEVEL);
  });

  it('drops a day with a non-finite value instead of drawing it as zero', () => {
    const rows = toForecastRows(null, [
      { dayKey: '2026-10-15', p10: Number.NaN, p50: 2.2, p90: 2.5 },
      { dayKey: '2026-10-16', p10: 1.9, p50: 2.1, p90: 2.4 },
    ]);

    expect(rows.map((row) => row.dayKey)).toEqual(['2026-10-16']);
  });

  it('has no observed row when there is no level yet', () => {
    expect(toForecastRows(null, [])).toEqual([]);
  });
});
