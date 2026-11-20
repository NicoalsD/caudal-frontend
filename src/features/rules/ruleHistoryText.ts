import { formatDecimal } from '../../core/format/decimal';
import type { ChangeValue, RuleChange } from '../../core/rules/ruleHistory';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import { dayLabel, windowRangeLabel } from './ruleLabels';

/** Names that make a change readable: sector names and valve codes, by id. */
export interface ChangeNames {
  readonly sectors: ReadonlyMap<string, string>;
  readonly valves: ReadonlyMap<string, string>;
}

/** The parameter a change talks about, in plain words ("Banda Baja: horas al día"). */
export function changeLabel(change: RuleChange, names: ChangeNames): string {
  if (change.area === 'band') {
    const band = bandLabel(change.subject);
    switch (change.field) {
      case 'minLevel':
        return t('ruleHistory.bandFrom', { band });
      case 'maxLevel':
        return t('ruleHistory.bandTo', { band });
      case 'dailyServiceHours':
        return t('ruleHistory.bandHours', { band });
      default:
        return t('ruleHistory.bandPriorityOnly', { band });
    }
  }
  if (change.area === 'sector') {
    const sector = names.sectors.get(change.subject) ?? t('rules.sectorUnknown');
    switch (change.field) {
      case 'included':
        return t('ruleHistory.sectorIncluded', { sector });
      case 'priority':
        return t('ruleHistory.sectorPriority', { sector });
      default:
        return t('ruleHistory.sectorRank', { sector });
    }
  }
  if (change.area === 'valve') {
    const code = names.valves.get(change.subject) ?? t('ruleHistory.unknownValve');
    return t('ruleHistory.valveOrder', { valve: code });
  }
  return t('ruleHistory.window');
}

/** The value of a change, in text: "2,50 m", "8 h", "Sí", "Lugar 1", "Lunes, 06:00 a 12:00". */
export function changeValueText(change: RuleChange, value: ChangeValue): string {
  if (value === null) {
    return t('ruleHistory.none');
  }
  switch (change.field) {
    case 'minLevel':
    case 'maxLevel':
      return typeof value === 'number'
        ? t('ruleHistory.meters', { value: formatDecimal(value) })
        : '';
    case 'dailyServiceHours':
      return typeof value === 'number'
        ? t('ruleHistory.hours', { value: formatDecimal(value) })
        : '';
    case 'priorityOnly':
      return value === true ? t('rules.yes') : t('rules.no');
    case 'included':
      return value === true ? t('ruleHistory.included') : t('ruleHistory.excluded');
    case 'priority':
      return value === true ? t('ruleHistory.priority') : t('ruleHistory.notPriority');
    case 'priorityRank':
      return typeof value === 'number' ? t('ruleHistory.rank', { rank: String(value) }) : '';
    case 'sequenceOrder':
      return typeof value === 'number' ? t('ruleHistory.order', { order: String(value) }) : '';
    case 'window':
      return typeof value === 'object'
        ? t('ruleHistory.windowValue', {
            day: dayLabel(value.dayOfWeek),
            range: windowRangeLabel(value),
          })
        : '';
  }
  return '';
}
