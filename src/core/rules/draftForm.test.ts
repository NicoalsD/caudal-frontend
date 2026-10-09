import { describe, expect, it } from 'vitest';

import {
  bandsToRows,
  rowsToBands,
  rowsToSectors,
  rowsToWindows,
  sectorsToRows,
  toDraftFormValues,
  windowsToRows,
} from './draftForm';
import type { RuleBand } from './ruleSetParts';

const HIGH: RuleBand = {
  band: 'HIGH',
  minLevel: 3.5,
  maxLevel: 5,
  dailyServiceHours: 16,
  priorityOnly: false,
};
const CRITICAL: RuleBand = {
  band: 'CRITICAL',
  minLevel: 0,
  maxLevel: 1.5,
  dailyServiceHours: 3,
  priorityOnly: true,
};

const SATURDAY = 6;

describe('bandsToRows', () => {
  it('writes numbers with decimal comma and orders from the highest band down', () => {
    expect(bandsToRows([CRITICAL, HIGH])).toEqual([
      {
        band: 'HIGH',
        min_level: '3,5',
        max_level: '5',
        daily_service_hours: '16',
        priority_only: false,
      },
      {
        band: 'CRITICAL',
        min_level: '0',
        max_level: '1,5',
        daily_service_hours: '3',
        priority_only: true,
      },
    ]);
  });

  it('does not change the list it receives', () => {
    const bands = [CRITICAL, HIGH];

    bandsToRows(bands);

    expect(bands).toEqual([CRITICAL, HIGH]);
    expect(toDraftFormValues({ bands, sectors: [], operatingWindows: [] }, []).bands).toHaveLength(
      bands.length,
    );
  });
});

describe('rowsToBands', () => {
  it('turns parsed rows into the bands of the API', () => {
    expect(
      rowsToBands([
        {
          band: 'HIGH',
          min_level: 3.5,
          max_level: 5,
          daily_service_hours: 16,
          priority_only: false,
        },
      ]),
    ).toEqual([HIGH]);
  });

  it('refuses a code that is not a band', () => {
    expect(() =>
      rowsToBands([
        {
          band: 'MEDIUM',
          min_level: 0,
          max_level: 1,
          daily_service_hours: 1,
          priority_only: false,
        },
      ]),
    ).toThrow('Unknown band code "MEDIUM"');
  });
});

describe('sector rows', () => {
  it('lists priority sectors first and adds the sectors the version does not mention', () => {
    const rows = sectorsToRows(
      [
        { sectorId: 'b', isIncluded: true, isPriority: false, priorityRank: null },
        { sectorId: 'a', isIncluded: true, isPriority: true, priorityRank: 1 },
      ],
      ['a', 'b', 'c'],
    );

    expect(rows.map((row) => row.sector_id)).toEqual(['a', 'b', 'c']);
  });

  it('computes the ranks from the order of the rows when sending', () => {
    expect(
      rowsToSectors([
        { sector_id: 'x', is_included: true, is_priority: false },
        { sector_id: 'y', is_included: false, is_priority: true },
      ]),
    ).toEqual([
      { sectorId: 'x', isIncluded: true, isPriority: false, priorityRank: null },
      { sectorId: 'y', isIncluded: false, isPriority: true, priorityRank: 1 },
    ]);
  });
});

describe('window rows', () => {
  it('writes "all" for every day, orders by day and start, and goes back to the API shape', () => {
    const rows = windowsToRows([
      { dayOfWeek: SATURDAY, start: '14:00', end: '18:00' },
      { dayOfWeek: null, start: '05:00', end: '21:00' },
      { dayOfWeek: SATURDAY, start: '06:00', end: '10:00' },
    ]);

    expect(rows.map((row) => `${row.day} ${row.start_time}`)).toEqual([
      'all 05:00',
      '6 06:00',
      '6 14:00',
    ]);
    expect(rowsToWindows([{ day: null, start_time: '05:00', end_time: '21:00' }])).toEqual([
      { dayOfWeek: null, start: '05:00', end: '21:00' },
    ]);
  });
});
