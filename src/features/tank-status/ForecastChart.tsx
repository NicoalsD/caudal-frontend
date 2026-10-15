import type { JSX } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatDecimal } from '../../core/format/decimal';
import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import type { ForecastView, TankView, TankStatusView } from '../../services/api/views';
import { cn } from '../../ui/styles/cn';
import { toForecastRows } from './forecastRows';
import styles from './TankStatus.module.css';

const LEVEL_DIGITS = 2;
/** Stroke widths and sizes of the chart, in pixels (presentation only). */
const MEDIAN_STROKE_WIDTH = 3;
const EDGE_STROKE_WIDTH = 1;
const BAND_FILL_OPACITY = 0.6;
const MARKER_RADIUS = 4;
const AXIS_WIDTH = 48;
const CHART_MARGIN = { top: 8, right: 16, bottom: 8, left: 0 } as const;
const EDGE_DASH = '4 4';

interface ForecastChartProps {
  readonly tank: TankView;
  readonly forecast: ForecastView;
  readonly observed: TankStatusView['level'];
}

function formatLevel(value: number): string {
  return formatDecimal(value, LEVEL_DIGITS);
}

/**
 * The observed level (a dot), the expected level per day (p50) with its likely range (p10 to p90)
 * over the tank's gauge. The same numbers are in a table for people who cannot read the drawing.
 */
export function ForecastChart({ tank, forecast, observed }: ForecastChartProps): JSX.Element {
  const rows = toForecastRows(
    observed === null ? null : { dayKey: observed.observedAt.dayKey, value: observed.value.value },
    forecast.points.map((point) => ({
      dayKey: point.targetDate,
      p10: point.p10,
      p50: point.p50,
      p90: point.p90,
    })),
  );
  const labelOf = (dayKey: string): string => formatDayKey(dayKey);
  return (
    <div className={cn(styles.stack)}>
      <div className={cn(styles.chartWrap)} role="img" aria-label={t('forecast.chartLabel')}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows.map((row) => ({ ...row, day: labelOf(row.dayKey) }))}
            margin={CHART_MARGIN}
          >
            <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="var(--color-text-secondary)" />
            <YAxis
              domain={[tank.gaugeMin, tank.gaugeMax]}
              tickFormatter={(value: number) => formatLevel(value)}
              stroke="var(--color-text-secondary)"
              width={AXIS_WIDTH}
            />
            <Tooltip
              formatter={(value) =>
                Array.isArray(value)
                  ? `${formatLevel(Number(value[0]))} - ${formatLevel(Number(value[1]))}`
                  : formatLevel(Number(value))
              }
              contentStyle={{
                background: 'var(--color-raised)',
                border: '1px solid var(--color-border-strong)',
                color: 'var(--color-text-primary)',
              }}
            />
            <Area
              dataKey="range"
              name={t('forecast.range')}
              stroke="none"
              fill="var(--color-water-300)"
              fillOpacity={BAND_FILL_OPACITY}
              isAnimationActive={false}
            />
            <Line
              dataKey="p10"
              name={t('forecast.p10')}
              stroke="var(--color-water-700)"
              strokeWidth={EDGE_STROKE_WIDTH}
              strokeDasharray={EDGE_DASH}
              dot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Line
              dataKey="p90"
              name={t('forecast.p90')}
              stroke="var(--color-water-700)"
              strokeWidth={EDGE_STROKE_WIDTH}
              strokeDasharray={EDGE_DASH}
              dot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Line
              dataKey="p50"
              name={t('forecast.median')}
              stroke="var(--color-water-700)"
              strokeWidth={MEDIAN_STROKE_WIDTH}
              dot={{ r: MARKER_RADIUS, fill: 'var(--color-water-700)' }}
              isAnimationActive={false}
            />
            <Line
              dataKey="observed"
              name={t('forecast.observed')}
              stroke="none"
              dot={{ r: MARKER_RADIUS, fill: 'var(--color-text-primary)' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <table className={cn(styles.pointsTable)}>
        <caption>{t('forecast.tableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('forecast.day')}</th>
            <th scope="col">{t('forecast.p10')}</th>
            <th scope="col">{t('forecast.p50')}</th>
            <th scope="col">{t('forecast.p90')}</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((row) => row.p50 !== undefined)
            .map((row) => (
              <tr key={row.dayKey}>
                <th scope="row">{labelOf(row.dayKey)}</th>
                <td>{formatLevel(row.p10 ?? 0)}</td>
                <td>{formatLevel(row.p50 ?? 0)}</td>
                <td>{formatLevel(row.p90 ?? 0)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
