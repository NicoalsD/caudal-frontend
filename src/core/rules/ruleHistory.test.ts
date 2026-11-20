import { describe, expect, it } from 'vitest';

import { defaultComparison, diffRules, previousVersion } from './ruleHistory';
import type { ComparableRules } from './ruleHistory';
import type { OperatingWindow, RuleBand, SectorSetting, ValveOrder } from './ruleSetParts';

const SECTOR_A = 'sector-a';
const SECTOR_B = 'sector-b';
const VALVE_1 = 'valve-1';
const VALVE_2 = 'valve-2';
const BANDS_CHANGED = 4;
const VERSION_TWO = 2;
const VERSION_THREE = 3;

function band(overrides: Partial<RuleBand> & Pick<RuleBand, 'band'>): RuleBand {
  return {
    minLevel: 0,
    maxLevel: 1.5,
    dailyServiceHours: 3,
    priorityOnly: true,
    ...overrides,
  };
}

function sector(
  overrides: Partial<SectorSetting> & Pick<SectorSetting, 'sectorId'>,
): SectorSetting {
  return { isIncluded: true, isPriority: false, priorityRank: null, ...overrides };
}

const WINDOW_MORNING: OperatingWindow = { dayOfWeek: null, start: '06:00', end: '12:00' };
const WINDOW_AFTERNOON: OperatingWindow = { dayOfWeek: 1, start: '14:00', end: '18:00' };

function rules(overrides: Partial<ComparableRules> = {}): ComparableRules {
  return {
    bands: [
      band({ band: 'CRITICAL' }),
      band({
        band: 'LOW',
        minLevel: 1.5,
        maxLevel: 3.5,
        dailyServiceHours: 8,
        priorityOnly: false,
      }),
    ],
    sectors: [
      sector({ sectorId: SECTOR_A, isPriority: true, priorityRank: 1 }),
      sector({ sectorId: SECTOR_B }),
    ],
    valveOrder: [
      { valveId: VALVE_1, sequenceOrder: 1 },
      { valveId: VALVE_2, sequenceOrder: 2 },
    ],
    operatingWindows: [WINDOW_MORNING],
    ...overrides,
  };
}

describe('diffRules', () => {
  it('finds nothing when the two versions say the same', () => {
    expect(diffRules(rules(), rules())).toEqual([]);
  });

  it('lists each band field that changed, with the value before and after', () => {
    const changed = rules({
      bands: [
        band({ band: 'CRITICAL' }),
        band({
          band: 'LOW',
          minLevel: 1.5,
          maxLevel: 3.5,
          dailyServiceHours: 6,
          priorityOnly: true,
        }),
      ],
    });

    expect(diffRules(rules(), changed)).toEqual([
      { area: 'band', subject: 'LOW', field: 'dailyServiceHours', before: 8, after: 6 },
      { area: 'band', subject: 'LOW', field: 'priorityOnly', before: false, after: true },
    ]);
  });

  it('shows a band that exists on one side only as null on the other', () => {
    const lowOnly = rules().bands.filter((item) => item.band === 'LOW');
    const withoutCritical = rules({ bands: lowOnly });

    const changes = diffRules(rules(), withoutCritical);

    expect(changes).toHaveLength(BANDS_CHANGED);
    for (const change of changes) {
      expect(change).toMatchObject({ area: 'band', subject: 'CRITICAL', after: null });
    }
    expect(changes.map((change) => change.field)).toEqual([
      'minLevel',
      'maxLevel',
      'dailyServiceHours',
      'priorityOnly',
    ]);
  });

  it('reports priority and order changes of the sectors', () => {
    const reordered = rules({
      sectors: [
        sector({ sectorId: SECTOR_A }),
        sector({ sectorId: SECTOR_B, isPriority: true, priorityRank: 1 }),
      ],
    });

    expect(diffRules(rules(), reordered)).toEqual([
      { area: 'sector', subject: SECTOR_A, field: 'priority', before: true, after: false },
      { area: 'sector', subject: SECTOR_A, field: 'priorityRank', before: 1, after: null },
      { area: 'sector', subject: SECTOR_B, field: 'priority', before: false, after: true },
      { area: 'sector', subject: SECTOR_B, field: 'priorityRank', before: null, after: 1 },
    ]);
  });

  it('reports a sector that was left out of the service', () => {
    const excluded = rules({
      sectors: [
        sector({ sectorId: SECTOR_A, isPriority: true, priorityRank: 1 }),
        sector({ sectorId: SECTOR_B, isIncluded: false }),
      ],
    });

    expect(diffRules(rules(), excluded)).toEqual([
      { area: 'sector', subject: SECTOR_B, field: 'included', before: true, after: false },
    ]);
  });

  it('reports a change of the valve sequence', () => {
    const swapped: readonly ValveOrder[] = [
      { valveId: VALVE_1, sequenceOrder: 2 },
      { valveId: VALVE_2, sequenceOrder: 1 },
    ];

    expect(diffRules(rules(), rules({ valveOrder: swapped }))).toEqual([
      { area: 'valve', subject: VALVE_1, field: 'sequenceOrder', before: 1, after: 2 },
      { area: 'valve', subject: VALVE_2, field: 'sequenceOrder', before: 2, after: 1 },
    ]);
  });

  it('adds and removes operating windows as whole windows', () => {
    const changes = diffRules(
      rules({ operatingWindows: [WINDOW_MORNING] }),
      rules({ operatingWindows: [WINDOW_AFTERNOON] }),
    );

    expect(changes).toEqual([
      { area: 'window', subject: '', field: 'window', before: WINDOW_MORNING, after: null },
      { area: 'window', subject: '', field: 'window', before: null, after: WINDOW_AFTERNOON },
    ]);
  });

  it('treats the same window in another order as unchanged', () => {
    const before = rules({ operatingWindows: [WINDOW_MORNING, WINDOW_AFTERNOON] });
    const after = rules({ operatingWindows: [WINDOW_AFTERNOON, WINDOW_MORNING] });

    expect(diffRules(before, after)).toEqual([]);
  });
});

describe('previousVersion', () => {
  const versions = [
    { id: 'v3', version: 3 },
    { id: 'v1', version: 1 },
    { id: 'v2', version: 2 },
  ];

  it('gives the greatest version below the given one, whatever the list order', () => {
    expect(previousVersion(versions, VERSION_THREE)?.id).toBe('v2');
    expect(previousVersion(versions, VERSION_TWO)?.id).toBe('v1');
  });

  it('gives null for the first version', () => {
    expect(previousVersion(versions, 1)).toBeNull();
  });
});

describe('defaultComparison', () => {
  const versions = [
    { id: 'v3', version: 3 },
    { id: 'v2', version: 2 },
    { id: 'v1', version: 1 },
  ];

  it('compares the chosen version with the one before it', () => {
    expect(defaultComparison(versions, 'v3')).toEqual({
      before: { id: 'v2', version: 2 },
      after: { id: 'v3', version: 3 },
    });
  });

  it('compares the latest version when the chosen one is not in the list (a draft)', () => {
    expect(defaultComparison(versions, 'draft')?.after.id).toBe('v3');
  });

  it('has no version before the first one, and nothing to compare with when the list is empty', () => {
    expect(defaultComparison(versions, 'v1')).toEqual({
      before: null,
      after: { id: 'v1', version: 1 },
    });
    expect(defaultComparison([], 'v1')).toBeNull();
  });
});
