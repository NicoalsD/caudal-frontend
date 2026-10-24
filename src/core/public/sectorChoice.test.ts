import { describe, expect, it } from 'vitest';

import { resolveChosenSector, turnsForSector } from './sectorChoice';

const TURNS = [
  { sectorName: 'Sector Alto', startTime: '6:00 a. m.', endTime: '2:00 p. m.' },
  { sectorName: 'Sector Centro', startTime: '2:00 p. m.', endTime: '10:00 p. m.' },
  { sectorName: 'Sector Alto', startTime: '10:00 p. m.', endTime: '11:00 p. m.' },
];

describe('resolveChosenSector', () => {
  it('keeps the stored sector while it is in the schedule', () => {
    expect(resolveChosenSector(TURNS, 'Sector Centro')).toBe('Sector Centro');
  });

  it('gives nothing when no sector was stored', () => {
    expect(resolveChosenSector(TURNS, null)).toBeNull();
  });

  it('forgets a stored sector that the schedule no longer has', () => {
    expect(resolveChosenSector(TURNS, 'Sector Antiguo')).toBeNull();
  });

  it('gives nothing for an empty schedule, even with a stored name', () => {
    expect(resolveChosenSector([], 'Sector Alto')).toBeNull();
  });

  it('compares names exactly, without trimming or changing case', () => {
    expect(resolveChosenSector(TURNS, 'sector alto')).toBeNull();
    expect(resolveChosenSector(TURNS, 'Sector Alto ')).toBeNull();
  });
});

describe('turnsForSector', () => {
  it('returns the turns of that sector in their order', () => {
    expect(turnsForSector(TURNS, 'Sector Alto').map((turn) => turn.startTime)).toEqual([
      '6:00 a. m.',
      '10:00 p. m.',
    ]);
  });

  it('returns nothing for a sector without turns', () => {
    expect(turnsForSector(TURNS, 'Sector Sur')).toEqual([]);
  });
});
