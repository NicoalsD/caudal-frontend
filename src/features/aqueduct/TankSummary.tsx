import type { JSX } from 'react';
import { Bot, Calculator, Clock } from 'lucide-react';
import { Link } from 'react-router';

import { formatDecimal } from '../../core/format/decimal';
import { formatDayKey } from '../../core/format/time';
import { ROUTE_PATHS } from '../../core/session/routes';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import type { ForecastView } from '../../services/api/views';
import type { LiveAqueduct } from '../../state/hooks/useLiveAqueduct';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { useLatestForecast } from '../../state/hooks/useTankStatus';
import { cn } from '../../ui/styles/cn';
import styles from './TankSummary.module.css';

const PERCENT = 100;
const WHOLE = 0;
const LEVEL_DIGITS = 2;
const FORECAST_DIGITS = 1;
const DAY_MS = 86_400_000;
const NOON = 'T12:00:00Z';

interface TankSummaryProps {
  readonly aqueduct: LiveAqueduct;
  /** The Board shows the chart beside it, so the summary leaves the forecast out. */
  readonly withForecast?: boolean;
}

/**
 * The tank in a few lines: the level as the one large figure, the meters and how old the reading
 * is, the band, and the forecast for the next day as a plain sentence that says whether the AI
 * or the simple estimate made it.
 */
export function TankSummary({ aqueduct, withForecast = true }: TankSummaryProps): JSX.Element {
  const { level, status, tank } = aqueduct;
  const hours = status?.level?.hoursAgo ?? null;
  const stale = status?.stale.isStale ?? false;
  return (
    <section className={cn(styles.summary)} aria-labelledby="tank-summary-title">
      <h2 id="tank-summary-title" className={cn(styles.name)}>
        {tank.name}
      </h2>
      <p className={cn(styles.value)}>
        <span className={cn(styles.visuallyHidden)}>{t('console.levelLabel')}</span>
        {level === null
          ? t('console.levelNone')
          : t('console.levelPercent', {
              percent: formatDecimal(aqueduct.levelFraction * PERCENT, WHOLE),
            })}
      </p>
      {level === null ? null : (
        <p className={cn(styles.line)}>
          {hours !== null && hours >= 1
            ? t('console.levelLine', {
                level: formatDecimal(level, LEVEL_DIGITS),
                hours: formatDecimal(hours, WHOLE),
              })
            : t('console.levelLineNow', { level: formatDecimal(level, LEVEL_DIGITS) })}
          {status?.band == null
            ? null
            : t('console.bandSuffix', { band: bandLabel(status.band.code) })}
        </p>
      )}
      {stale ? (
        <p className={cn(styles.stale)}>
          <Clock aria-hidden="true" />
          {t('console.staleLong')}
        </p>
      ) : null}
      {withForecast ? <ForecastLine tankId={tank.id} /> : null}
    </section>
  );
}

function ForecastLine({ tankId }: { readonly tankId: string }): JSX.Element | null {
  const forecast = useLatestForecast(tankId);
  const today = useServiceToday();
  if (forecast.isPending) {
    return null;
  }
  const data = forecast.data;
  const point = data === undefined ? null : nextPoint(data, today);
  if (data === undefined || point === null) {
    return (
      <p className={cn(styles.forecast)}>
        {t('console.forecastNone')}{' '}
        <Link to={ROUTE_PATHS.tank} className={cn(styles.link)}>
          {t('console.forecastOpen')}
        </Link>
      </p>
    );
  }
  const tomorrow = isTomorrow(point.targetDate, today);
  const SourceIcon = data.isFallback ? Calculator : Bot;
  return (
    <div className={cn(styles.forecastBlock)}>
      <p className={cn(styles.forecast)}>
        {t('console.forecastSentence', {
          day: tomorrow ? t('console.tomorrow') : formatDayKey(point.targetDate),
          median: formatDecimal(point.p50, FORECAST_DIGITS),
          low: formatDecimal(point.p10, FORECAST_DIGITS),
          high: formatDecimal(point.p90, FORECAST_DIGITS),
        })}
      </p>
      <p className={cn(styles.source)}>
        <SourceIcon aria-hidden="true" />
        {data.isFallback ? t('console.forecastFallback') : t('console.forecastAi')}
        {' · '}
        <Link to={ROUTE_PATHS.tank} className={cn(styles.link)}>
          {t('console.forecastOpen')}
        </Link>
      </p>
    </div>
  );
}

/** The first forecast day after today, or the last one when all are today or before. */
function nextPoint(forecast: ForecastView, today: string): ForecastView['points'][number] | null {
  return (
    forecast.points.find((item) => item.targetDate > today) ??
    forecast.points[forecast.points.length - 1] ??
    null
  );
}

function isTomorrow(dayKey: string, today: string): boolean {
  return Date.parse(`${dayKey}${NOON}`) - Date.parse(`${today}${NOON}`) === DAY_MS;
}
