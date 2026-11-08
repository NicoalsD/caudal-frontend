import type { JSX } from 'react';

import { DomainError } from '../../core/errors/DomainError';
import { formatDecimal } from '../../core/format/decimal';
import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import { usePermission } from '../../state/hooks/usePermission';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ChartCard } from '../../ui/data/ChartCard';
import { cn } from '../../ui/styles/cn';
import { ForecastChart } from './ForecastChart';
import { ForecastRunAction } from './ForecastRunAction';
import { ForecastSourceNotice } from './ForecastSourceNotice';
import { LevelTimeline } from './LevelTimeline';
import { TankFacts } from './TankFacts';
import styles from './TankStatus.module.css';
import type { TankDay } from './useTankDay';

const NOT_FOUND_CODE = 'NOT_FOUND';
const LEVEL_DIGITS = 2;
const RUN_PERMISSION = 'FORECAST_RUN';
/** The plain sentences cover the next days; the folded table has all of them. */
const SUMMARY_DAYS = 3;
/** A line needs two days to be a line. */
const MIN_CHART_ROWS = 2;

interface LevelChartCardProps {
  readonly day: TankDay;
  /** The slider of days. The tank screen keeps it under the tank, the Board's under the chart. */
  readonly withTimeline?: boolean;
  /** The Board never registers readings: its facts ask the plumber. */
  readonly askPlumber?: boolean;
  /** Shows the meaning, trend and reading age under the chart. */
  readonly withFacts?: boolean;
}

/**
 * How the level is coming, as the hero card of the screen: the history and the forecast in one
 * chart with its pill tooltip, the source of the forecast, the plain sentences, the slider and,
 * for whoever has FORECAST_RUN, the button that asks the AI for a new run.
 */
export function LevelChartCard({
  day,
  withTimeline = false,
  askPlumber = false,
  withFacts = true,
}: LevelChartCardProps): JSX.Element {
  const canRun = usePermission(RUN_PERMISSION);
  const { forecast, rows, rules, tank, status } = day;
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
      <p className={cn(styles.empty)}>
        {rows.length >= MIN_CHART_ROWS ? t('forecast.noForecastYet') : t('forecast.none')}
      </p>
    );
  }
  const level = status.level?.value.value ?? null;

  return (
    <ChartCard
      title={t('forecast.title')}
      value={
        level === null
          ? t('board.kpis.noLevel')
          : t('tankStatus.levelValue', { value: formatDecimal(level, LEVEL_DIGITS) })
      }
      caption={t('tankStatus.stageTitle')}
    >
      {notice}
      {hasPoints ? <ForecastSourceNotice forecast={data} /> : null}
      {day.historyFailed ? (
        <p className={cn(styles.muted)}>{t('tankStatus.historyError')}</p>
      ) : null}
      {rows.length >= MIN_CHART_ROWS ? (
        <ForecastChart
          tank={tank}
          rows={rows}
          isFallback={hasPoints ? data.isFallback : null}
          bands={rules?.bands ?? []}
          reserveLevel={rules?.reserveLevel ?? null}
          selectedDayKey={day.selectedDayKey}
        />
      ) : null}
      {withTimeline ? (
        <LevelTimeline
          rows={rows}
          index={day.index}
          defaultIndex={day.defaultIndex}
          todayIndex={day.todayIndex}
          onChange={day.onPick}
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
      {withFacts ? <TankFacts status={status} rules={rules} askPlumber={askPlumber} /> : null}
      {canRun ? <ForecastRunAction tankId={tank.id} /> : null}
    </ChartCard>
  );
}
