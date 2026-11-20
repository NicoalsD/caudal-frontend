import { describe, expect, it } from 'vitest';

import type { RuleChange } from '../../core/rules/ruleHistory';
import { formatDecimal } from '../../core/format/decimal';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import { changeLabel, changeValueText, type ChangeNames } from './ruleHistoryText';

const NAMES: ChangeNames = {
  sectors: new Map([['sector-1', 'Sector Alto']]),
  valves: new Map([['valve-1', 'V-01']]),
};
const NO_NAMES: ChangeNames = { sectors: new Map(), valves: new Map() };
const WINDOW = { dayOfWeek: 1, start: '06:00', end: '12:00' };
const LEVEL_METERS = 2.5;
const MAX_METERS = 3;
const SERVICE_HOURS = 8;
const TWO = 2;
const FIVE = 5;

function change(partial: Partial<RuleChange> & Pick<RuleChange, 'area' | 'field'>): RuleChange {
  return { subject: '', before: null, after: null, ...partial };
}

describe('changeLabel', () => {
  it.each([
    ['minLevel', 'ruleHistory.bandFrom'],
    ['maxLevel', 'ruleHistory.bandTo'],
    ['dailyServiceHours', 'ruleHistory.bandHours'],
    ['priorityOnly', 'ruleHistory.bandPriorityOnly'],
  ] as const)('names a band change of %s', (field, key) => {
    const label = changeLabel(change({ area: 'band', subject: 'ALTA', field }), NAMES);

    expect(label).toBe(t(key, { band: bandLabel('ALTA') }));
  });

  it.each([
    ['included', 'ruleHistory.sectorIncluded'],
    ['priority', 'ruleHistory.sectorPriority'],
    ['priorityRank', 'ruleHistory.sectorRank'],
  ] as const)('names a sector change of %s with the sector name', (field, key) => {
    const label = changeLabel(change({ area: 'sector', subject: 'sector-1', field }), NAMES);

    expect(label).toBe(t(key, { sector: 'Sector Alto' }));
  });

  it('falls back to the unknown-sector text when the sector is not in the names', () => {
    const label = changeLabel(
      change({ area: 'sector', subject: 'missing', field: 'included' }),
      NO_NAMES,
    );

    expect(label).toBe(t('ruleHistory.sectorIncluded', { sector: t('rules.sectorUnknown') }));
  });

  it('names a valve order change with the valve code', () => {
    const label = changeLabel(
      change({ area: 'valve', subject: 'valve-1', field: 'sequenceOrder' }),
      NAMES,
    );

    expect(label).toBe(t('ruleHistory.valveOrder', { valve: 'V-01' }));
  });

  it('falls back to the unknown-valve text when the valve is not in the names', () => {
    const label = changeLabel(
      change({ area: 'valve', subject: 'missing', field: 'sequenceOrder' }),
      NO_NAMES,
    );

    expect(label).toBe(t('ruleHistory.valveOrder', { valve: t('ruleHistory.unknownValve') }));
  });

  it('names the operating window for any other area', () => {
    expect(changeLabel(change({ area: 'window', field: 'window' }), NAMES)).toBe(
      t('ruleHistory.window'),
    );
  });
});

describe('changeValueText', () => {
  it('says none when the value is missing on that side', () => {
    expect(changeValueText(change({ area: 'band', field: 'minLevel' }), null)).toBe(
      t('ruleHistory.none'),
    );
  });

  it('formats levels and hours as numbers, and blanks a value of the wrong type', () => {
    const level = change({ area: 'band', field: 'minLevel' });
    const max = change({ area: 'band', field: 'maxLevel' });
    const hours = change({ area: 'band', field: 'dailyServiceHours' });

    expect(changeValueText(level, LEVEL_METERS)).toBe(
      t('ruleHistory.meters', { value: formatDecimal(LEVEL_METERS) }),
    );
    expect(changeValueText(max, MAX_METERS)).toBe(
      t('ruleHistory.meters', { value: formatDecimal(MAX_METERS) }),
    );
    expect(changeValueText(hours, SERVICE_HOURS)).toBe(
      t('ruleHistory.hours', { value: formatDecimal(SERVICE_HOURS) }),
    );
    expect(changeValueText(level, true)).toBe('');
    expect(changeValueText(max, true)).toBe('');
    expect(changeValueText(hours, true)).toBe('');
  });

  it('answers yes or no for priorityOnly and the included or priority flags', () => {
    expect(changeValueText(change({ area: 'band', field: 'priorityOnly' }), true)).toBe(
      t('rules.yes'),
    );
    expect(changeValueText(change({ area: 'band', field: 'priorityOnly' }), false)).toBe(
      t('rules.no'),
    );
    expect(changeValueText(change({ area: 'sector', field: 'included' }), true)).toBe(
      t('ruleHistory.included'),
    );
    expect(changeValueText(change({ area: 'sector', field: 'included' }), false)).toBe(
      t('ruleHistory.excluded'),
    );
    expect(changeValueText(change({ area: 'sector', field: 'priority' }), true)).toBe(
      t('ruleHistory.priority'),
    );
    expect(changeValueText(change({ area: 'sector', field: 'priority' }), false)).toBe(
      t('ruleHistory.notPriority'),
    );
  });

  it('gives the rank and the order as numbers, and blanks other types', () => {
    const rank = change({ area: 'sector', field: 'priorityRank' });
    const order = change({ area: 'valve', field: 'sequenceOrder' });

    expect(changeValueText(rank, 1)).toBe(t('ruleHistory.rank', { rank: '1' }));
    expect(changeValueText(order, TWO)).toBe(t('ruleHistory.order', { order: '2' }));
    expect(changeValueText(rank, false)).toBe('');
    expect(changeValueText(order, false)).toBe('');
  });

  it('describes an operating window with its day and range, and blanks a non-window value', () => {
    const window = change({ area: 'window', field: 'window' });

    expect(changeValueText(window, WINDOW)).toBe(
      t('ruleHistory.windowValue', {
        day: t('rules.day.d1'),
        range: t('rules.windowRange', { start: '06:00', end: '12:00' }),
      }),
    );
    expect(changeValueText(window, FIVE)).toBe('');
  });

  it('returns an empty text for a field it does not know', () => {
    const unknown = { area: 'band', field: 'unknownField' } as unknown as RuleChange;

    expect(changeValueText(unknown, 1)).toBe('');
  });
});
