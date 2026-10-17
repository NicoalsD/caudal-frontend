import type { JSX } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock, Minus } from 'lucide-react';

import { formatDecimal } from '../../core/format/decimal';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import type { TankStatusView, TankView, TrendLabel } from '../../services/api/views';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { cn } from '../../ui/styles/cn';
import styles from './TankStatus.module.css';

/** Whole hours: the age of a level is a rough figure for the person reading it. */
const HOURS_DIGITS = 0;
const SLOPE_DIGITS = 2;

interface TankStatusCardProps {
  readonly tank: TankView;
  readonly status: TankStatusView;
}

function trendText(trend: NonNullable<TankStatusView['trend']>): string {
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
function TrendIcon({ label }: { readonly label: TrendLabel | null }): JSX.Element {
  switch (label) {
    case 'DOWN':
      return <ArrowDownRight aria-hidden="true" className={cn(styles.icon)} />;
    case 'UP':
      return <ArrowUpRight aria-hidden="true" className={cn(styles.icon)} />;
    default:
      return <Minus aria-hidden="true" className={cn(styles.icon)} />;
  }
}

/**
 * Screen S12 status block: the last level in large figures, how old it is, the trend, the band
 * with its hours of service and the open alerts. The band hours come from the rules when the
 * status does not send them.
 */
export function TankStatusCard({ tank, status }: TankStatusCardProps): JSX.Element {
  const rules = useCurrentRuleSet();
  const band = status.band;
  const serviceHours =
    band === null
      ? null
      : (band.serviceHours ??
        rules.data?.bands.find((item) => item.band === band.code)?.dailyServiceHours ??
        null);

  return (
    <section className={cn(styles.card)} aria-labelledby="tank-card-title">
      <h2 id="tank-card-title">{t('tankStatus.cardTitle', { name: tank.name })}</h2>
      {status.level === null ? (
        <p>{t('tankStatus.noLevel')}</p>
      ) : (
        <>
          <div className={cn(styles.level)}>
            <span className={cn(styles.muted)}>{t('tankStatus.levelLabel')}</span>
            <span className={cn(styles.levelValue)}>
              {t('tankStatus.levelValue', { value: status.level.value.text })}
            </span>
            <span className={cn(styles.muted)}>
              {t('tankStatus.takenAgo', {
                hours: formatDecimal(status.level.hoursAgo, HOURS_DIGITS),
              })}
            </span>
            <span className={cn(styles.muted)}>
              {t('tankStatus.observedAt', { date: status.level.observedAt.text })}
            </span>
          </div>
          {status.stale.isStale ? (
            <div className={cn(styles.stale)} role="status">
              <Clock aria-hidden="true" className={cn(styles.icon)} />
              <div>
                <strong>{t('tankStatus.staleTitle')}</strong>
                <p>
                  {t('tankStatus.staleText', {
                    hours: formatDecimal(status.stale.staleAfterHours, HOURS_DIGITS),
                  })}
                </p>
              </div>
            </div>
          ) : null}
          <dl className={cn(styles.facts)}>
            <div className={cn(styles.fact)}>
              <dt>{t('tankStatus.trendLabel')}</dt>
              {status.trend === null ? (
                <dd>{t('tankStatus.noTrend')}</dd>
              ) : (
                <>
                  <dd className={cn(styles.trend)}>
                    <TrendIcon label={status.trend.label} />
                    {trendText(status.trend)}
                  </dd>
                  <dd className={cn(styles.muted)}>
                    {t('tankStatus.slopePerDay', {
                      value: formatDecimal(status.trend.slopePerDay, SLOPE_DIGITS),
                    })}
                  </dd>
                </>
              )}
            </div>
            <div className={cn(styles.fact)}>
              <dt>{t('tankStatus.bandLabel')}</dt>
              <dd>{band === null ? '-' : bandLabel(band.code)}</dd>
              <dd className={cn(styles.muted)}>
                {serviceHours === null
                  ? t('tankStatus.bandHoursUnknown')
                  : t('tankStatus.bandHours', {
                      hours: formatDecimal(serviceHours, HOURS_DIGITS),
                    })}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
