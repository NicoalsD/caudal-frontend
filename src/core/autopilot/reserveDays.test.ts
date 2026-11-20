import { describe, expect, it } from 'vitest';

import { reserveDays } from './reserveDays';

const POINTS = [
  { dayKey: '2026-11-08', p50: 2.0 },
  { dayKey: '2026-11-09', p50: 1.6 },
  { dayKey: '2026-11-10', p50: 1.2 },
];

const TWO_DAYS = 2;

describe('reserveDays', () => {
  it('counts the days until the median reaches the reserve', () => {
    const result = reserveDays({
      today: '2026-11-08',
      currentLevel: 2.1,
      reserveLevel: 1.5,
      points: POINTS,
    });
    expect(result).toEqual({ days: 2, atLeast: false });
  });

  it('is zero when the level is already at the reserve', () => {
    const result = reserveDays({
      today: '2026-11-08',
      currentLevel: 1.4,
      reserveLevel: 1.5,
      points: POINTS,
    });
    expect(result).toEqual({ days: 0, atLeast: false });
  });

  it('gives a lower bound when the forecast never reaches the reserve', () => {
    const result = reserveDays({
      today: '2026-11-08',
      currentLevel: 2.1,
      reserveLevel: 0.5,
      points: POINTS,
    });
    expect(result).toEqual({ days: 2, atLeast: true });
  });

  it('says nothing without a forecast or a reserve', () => {
    expect(
      reserveDays({ today: '2026-11-08', currentLevel: 2, reserveLevel: 1, points: [] }),
    ).toBeNull();
    expect(
      reserveDays({ today: '2026-11-08', currentLevel: 2, reserveLevel: null, points: POINTS }),
    ).toBeNull();
  });

  it('ignores points that are not numbers', () => {
    const result = reserveDays({
      today: '2026-11-08',
      currentLevel: 2,
      reserveLevel: 1.5,
      points: [{ dayKey: '2026-11-09', p50: Number.NaN }, ...POINTS],
    });
    expect(result?.days).toBe(TWO_DAYS);
  });
});
