import { describe, expect, it } from 'vitest';

import { settingsErrors } from './autopilotModel';

describe('settingsErrors', () => {
  it('accepts the limits of the contract', () => {
    expect(settingsErrors({ operatorAbsenceMinutes: 1, reserveFloorPct: 0 })).toEqual([]);
    expect(settingsErrors({ operatorAbsenceMinutes: 1440, reserveFloorPct: 100 })).toEqual([]);
  });

  it('flags minutes out of range or fractional, and a floor out of range', () => {
    expect(settingsErrors({ operatorAbsenceMinutes: 0, reserveFloorPct: 50 })).toEqual(['absence']);
    expect(settingsErrors({ operatorAbsenceMinutes: 1441, reserveFloorPct: 50 })).toEqual([
      'absence',
    ]);
    expect(settingsErrors({ operatorAbsenceMinutes: 2.5, reserveFloorPct: 50 })).toEqual([
      'absence',
    ]);
    expect(settingsErrors({ operatorAbsenceMinutes: 30, reserveFloorPct: 101 })).toEqual(['floor']);
    expect(settingsErrors({ operatorAbsenceMinutes: Number.NaN, reserveFloorPct: -1 })).toEqual([
      'absence',
      'floor',
    ]);
  });
});
