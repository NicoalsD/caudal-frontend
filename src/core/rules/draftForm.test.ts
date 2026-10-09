import { describe, expect, it } from 'vitest';

import { bandsToRows, rowsToBands, toDraftFormValues } from './draftForm';
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
    expect(toDraftFormValues(bands).bands).toHaveLength(bands.length);
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
