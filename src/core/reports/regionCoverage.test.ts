import { describe, expect, it } from 'vitest';

import { coverageByRegion, regionNameOf } from './regionCoverage';
import type { ShiftsRow } from './reportModel';

const SECTORS = [
  { id: 'n', name: 'Norte', parentSectorId: null },
  { id: 'a', name: 'Alto', parentSectorId: 'n' },
  { id: 'b', name: 'Bajo', parentSectorId: 'a' },
  { id: 's', name: 'Sur', parentSectorId: null },
];

const row = (sector: string, planned: number, completed: number): ShiftsRow => ({
  sector,
  planned,
  plannedHours: planned * HOURS_PER_SHIFT,
  completed,
  partial: 0,
  notExecuted: planned - completed,
});

const HOURS_PER_SHIFT = 2;
const TWO = 2;
const DEEP = 2;

describe('regionCoverage', () => {
  it('finds the root of a nested sector and survives a cycle', () => {
    expect(regionNameOf(SECTORS[DEEP]!, SECTORS)).toBe('Norte');
    const loop = [
      { id: 'x', name: 'X', parentSectorId: 'y' },
      { id: 'y', name: 'Y', parentSectorId: 'x' },
    ];
    expect(typeof regionNameOf(loop[0]!, loop)).toBe('string');
  });

  it('adds the shifts of every sector under its region', () => {
    const result = coverageByRegion(
      [row('Alto', TWO, 1), row('Bajo', TWO, TWO), row('Sur', 0, 0)],
      SECTORS,
    );
    expect(result).toEqual([
      { region: 'Norte', plannedShifts: 4, plannedHours: 8, completedShifts: 3, share: 0.75 },
      { region: 'Sur', plannedShifts: 0, plannedHours: 0, completedShifts: 0, share: null },
    ]);
  });

  it('keeps a sector the list does not know as its own region', () => {
    expect(coverageByRegion([row('Fantasma', 1, 1)], SECTORS)[0]?.region).toBe('Fantasma');
  });
});
