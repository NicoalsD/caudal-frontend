import type { JSX } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { formatDecimal } from '../../core/format/decimal';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import type { RuleSetView, TankStatusView, TrendLabel } from '../../services/api/views';
import { cn } from '../../ui/styles/cn';
import styles from './TankStatus.module.css';

/** Whole hours: the age of a level is a rough figure for the person reading it. */
export const HOURS_DIGITS = 0;
export const SLOPE_DIGITS = 2;

export function trendText(trend: NonNullable<TankStatusView['trend']>): string {
  switch (trend.label) {
    case 'DOWN':
      return t('tankStatus.trendDown');
    case 'STABLE':
      return t('tankStatus.trendStable');
    case 'UP':
      return t('tankStatus.trendUp');
    case null:
      return trend.labelEs ?? t('tankStatus.trendStable');
  }
}

/** The arrow is a second signal next to the words, never the only one. */
export function TrendIcon({ label }: { readonly label: TrendLabel | null }): JSX.Element {
  switch (label) {
    case 'DOWN':
      return <ArrowDownRight aria-hidden="true" className={cn(styles.icon)} />;
    case 'UP':
      return <ArrowUpRight aria-hidden="true" className={cn(styles.icon)} />;
    default:
      return <Minus aria-hidden="true" className={cn(styles.icon)} />;
  }
}

export function meaningText(code: string, serviceHours: number | null): string {
  if (serviceHours === null) {
    return t('tankStatus.meaningNoHours', { band: bandLabel(code).toLowerCase() });
  }
  const hours = formatDecimal(serviceHours, HOURS_DIGITS);
  switch (code) {
    case 'CRITICAL':
      return t('tankStatus.meaningCritical', { hours });
    case 'HIGH':
      return t('tankStatus.meaningHigh', { hours });
    default:
      return t('tankStatus.meaningLow', { hours });
  }
}

/** Hours of service per day for the band the tank is in: the status's, or the rules'. */
export function serviceHoursOf(
  status: TankStatusView,
  rules: RuleSetView | undefined,
): number | null {
  const band = status.band;
  if (band === null) {
    return null;
  }
  return (
    band.serviceHours ??
    rules?.bands.find((item) => item.band === band.code)?.dailyServiceHours ??
    null
  );
}
