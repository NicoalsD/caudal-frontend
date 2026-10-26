import type { BandCode, OperatingWindow, RuleSetStatus } from '../../core/rules/ruleSetParts';
import { t } from '../../i18n/t';

const DAY_KEYS = {
  1: 'rules.day.d1',
  2: 'rules.day.d2',
  3: 'rules.day.d3',
  4: 'rules.day.d4',
  5: 'rules.day.d5',
  6: 'rules.day.d6',
  7: 'rules.day.d7',
} as const;

export function bandLabel(band: BandCode): string {
  return t(`rules.band.${band.toLowerCase() as Lowercase<BandCode>}`);
}

/** "Lunes", or "Todos los días" for a window without a day. */
export function statusLabel(status: RuleSetStatus): string {
  return t(`rules.status.${status.toLowerCase() as Lowercase<RuleSetStatus>}`);
}

export function dayLabel(dayOfWeek: number | null): string {
  if (dayOfWeek === null) {
    return t('rules.day.all');
  }
  const key = DAY_KEYS[dayOfWeek as keyof typeof DAY_KEYS] as
    (typeof DAY_KEYS)[keyof typeof DAY_KEYS] | undefined;
  return key === undefined ? String(dayOfWeek) : t(key);
}

export function windowRangeLabel(window: Pick<OperatingWindow, 'start' | 'end'>): string {
  return t('rules.windowRange', { start: window.start, end: window.end });
}
