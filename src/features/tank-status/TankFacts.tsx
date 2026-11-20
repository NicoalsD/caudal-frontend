import type { JSX } from 'react';
import { Clock } from 'lucide-react';

import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';
import type { RuleSetView, TankStatusView } from '../../services/api/views';
import { usePermission } from '../../state/hooks/usePermission';
import { cn } from '../../ui/styles/cn';
import styles from './TankStatus.module.css';
import {
  HOURS_DIGITS,
  meaningText,
  serviceHoursOf,
  SLOPE_DIGITS,
  TrendIcon,
  trendText,
} from './tankText';

/** Whoever may register readings is told to register one; the others to ask the plumber. */
const READING_PERMISSION = 'READING_CREATE';

/**
 * What the level means in one sentence, how it is moving, when it was read and, if the data is
 * old, a warning. The Board never registers readings: it asks the plumber, whatever its rights.
 */
export function TankFacts({
  status,
  rules,
  askPlumber = false,
}: {
  readonly status: TankStatusView;
  readonly rules: RuleSetView | undefined;
  readonly askPlumber?: boolean;
}): JSX.Element {
  const canRegister = usePermission(READING_PERMISSION);
  const band = status.band;
  if (status.level === null) {
    return <p>{t('tankStatus.noLevel')}</p>;
  }
  return (
    <div className={cn(styles.facts)}>
      {band === null ? null : (
        <p className={cn(styles.meaning)}>
          {meaningText(band.code, serviceHoursOf(status, rules))}
        </p>
      )}
      <p className={cn(styles.muted, styles.trendLine)}>
        {status.trend === null ? (
          t('tankStatus.noTrend')
        ) : (
          <>
            <TrendIcon label={status.trend.label} />
            <strong>{trendText(status.trend)}</strong>
            {t('tankStatus.slopePerDay', {
              value: formatDecimal(status.trend.slopePerDay, SLOPE_DIGITS),
            })}
          </>
        )}
      </p>
      <p className={cn(styles.muted)}>
        <span>
          {t('tankStatus.takenAgo', { hours: formatDecimal(status.level.hoursAgo, HOURS_DIGITS) })}
        </span>
        {' · '}
        <span>{t('tankStatus.observedAt', { date: status.level.observedAt.text })}</span>
      </p>
      {status.stale.isStale ? (
        <div className={cn(styles.stale)} role="status">
          <Clock aria-hidden="true" className={cn(styles.icon)} />
          <div>
            <strong>{t('tankStatus.staleTitle')}</strong>
            <p>
              {t(
                canRegister && !askPlumber ? 'tankStatus.staleText' : 'tankStatus.staleTextBoard',
                { hours: formatDecimal(status.stale.staleAfterHours, HOURS_DIGITS) },
              )}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
