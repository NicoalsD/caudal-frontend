import type { JSX } from 'react';

import { DomainError } from '../../core/errors/DomainError';
import { formatDecimal } from '../../core/format/decimal';
import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import type { TankStatusView, TankView } from '../../services/api/views';
import { usePermission } from '../../state/hooks/usePermission';
import { useLatestForecast } from '../../state/hooks/useTankStatus';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { cn } from '../../ui/styles/cn';
import { ForecastChart } from './ForecastChart';
import { ForecastRunAction } from './ForecastRunAction';
import { ForecastSourceNotice } from './ForecastSourceNotice';
import styles from './TankStatus.module.css';

const NOT_FOUND_CODE = 'NOT_FOUND';
const LEVEL_DIGITS = 2;
const RUN_PERMISSION = 'FORECAST_RUN';

/**
 * The forecast block: loading, error, "no forecast yet" or the chart with its plain sentences.
 * Whoever has FORECAST_RUN also gets the button that asks the AI for a new run.
 */
export function ForecastSection({
  tank,
  observed,
}: {
  readonly tank: TankView;
  readonly observed: TankStatusView['level'];
}): JSX.Element {
  const forecast = useLatestForecast(tank.id);
  const canRun = usePermission(RUN_PERMISSION);
  let body: JSX.Element;
  if (forecast.isPending) {
    body = <LoadingState message={t('forecast.loading')} />;
  } else if (forecast.isError) {
    body =
      forecast.error instanceof DomainError && forecast.error.code === NOT_FOUND_CODE ? (
        <p>{t('forecast.none')}</p>
      ) : (
        <QueryError
          title={t('forecast.title')}
          error={forecast.error}
          onRetry={() => void forecast.refetch()}
        />
      );
  } else if (forecast.data.points.length === 0) {
    body = <p>{t('forecast.none')}</p>;
  } else {
    const data = forecast.data;
    body = (
      <>
        <ForecastSourceNotice forecast={data} />
        <ul className={cn(styles.summary)}>
          {data.points.map((point) => (
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
        <ForecastChart tank={tank} forecast={data} observed={observed} />
      </>
    );
  }
  return (
    <section className={cn(styles.card)} aria-labelledby="forecast-title">
      <h2 id="forecast-title">{t('forecast.title')}</h2>
      {body}
      {canRun ? <ForecastRunAction tankId={tank.id} /> : null}
    </section>
  );
}
