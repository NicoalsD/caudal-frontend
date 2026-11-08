import type { JSX } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

import { DomainError } from '../../core/errors/DomainError';
import { formatDecimal } from '../../core/format/decimal';
import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import type { ForecastView, RuleSetView, TankView } from '../../services/api/views';
import { usePermission } from '../../state/hooks/usePermission';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { cn } from '../../ui/styles/cn';
import { ForecastChart } from './ForecastChart';
import type { ForecastRow } from './forecastRows';
import { ForecastRunAction } from './ForecastRunAction';
import { ForecastSourceNotice } from './ForecastSourceNotice';
import styles from './TankStatus.module.css';

const NOT_FOUND_CODE = 'NOT_FOUND';
const LEVEL_DIGITS = 2;
const RUN_PERMISSION = 'FORECAST_RUN';
/** The plain sentences cover the next days; the folded table has all of them. */
const SUMMARY_DAYS = 3;
/** A line needs two days to be a line. */
const MIN_CHART_ROWS = 2;

interface ForecastSectionProps {
  readonly tank: TankView;
  readonly forecast: UseQueryResult<ForecastView>;
  readonly historyFailed: boolean;
  readonly rows: readonly ForecastRow[];
  readonly rules: RuleSetView | undefined;
  readonly selectedDayKey: string | null;
}

/**
 * How the level is coming: the history and the forecast in one chart, the forecast in plain
 * sentences and, for whoever has FORECAST_RUN, the button that asks the AI for a new run.
 */
export function ForecastSection({
  tank,
  forecast,
  historyFailed,
  rows,
  rules,
  selectedDayKey,
}: ForecastSectionProps): JSX.Element {
  const canRun = usePermission(RUN_PERMISSION);
  const data = forecast.data;
  const hasPoints = data !== undefined && data.points.length > 0;
  const missing =
    forecast.isError &&
    forecast.error instanceof DomainError &&
    forecast.error.code === NOT_FOUND_CODE;

  let notice: JSX.Element | null = null;
  if (forecast.isPending) {
    notice = <LoadingState message={t('forecast.loading')} />;
  } else if (forecast.isError && !missing) {
    notice = (
      <QueryError
        title={t('forecast.title')}
        error={forecast.error}
        onRetry={() => void forecast.refetch()}
      />
    );
  } else if (!hasPoints) {
    notice = (
      <p>{rows.length >= MIN_CHART_ROWS ? t('forecast.noForecastYet') : t('forecast.none')}</p>
    );
  }

  return (
    <section className={cn(styles.card)} aria-labelledby="forecast-title">
      <h2 id="forecast-title">{t('forecast.title')}</h2>
      {notice}
      {hasPoints ? <ForecastSourceNotice forecast={data} /> : null}
      {historyFailed ? <p className={cn(styles.muted)}>{t('tankStatus.historyError')}</p> : null}
      {rows.length >= MIN_CHART_ROWS ? (
        <ForecastChart
          tank={tank}
          rows={rows}
          isFallback={hasPoints ? data.isFallback : null}
          bands={rules?.bands ?? []}
          reserveLevel={rules?.reserveLevel ?? null}
          selectedDayKey={selectedDayKey}
        />
      ) : null}
      {hasPoints ? (
        <ul className={cn(styles.summary)}>
          {data.points.slice(0, SUMMARY_DAYS).map((point) => (
            <li key={point.targetDate}>
              {t('forecast.summary', {
                day: formatDayKey(point.targetDate),
                median: formatDecimal(point.p50, LEVEL_DIGITS),
                low: formatDecimal(point.p10, LEVEL_DIGITS),
                high: formatDecimal(point.p90, LEVEL_DIGITS),
              })}
            </li>
          ))}
        </ul>
      ) : null}
      {canRun ? <ForecastRunAction tankId={tank.id} /> : null}
    </section>
  );
}
