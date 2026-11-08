import type { JSX } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatDecimal } from '../../core/format/decimal';
import { forecastSourceState } from '../../core/forecast/forecastSource';
import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import { bandLabel } from '../../i18n/bandLabel';
import type { RuleBand } from '../../core/rules/ruleSetParts';
import type { TankView } from '../../services/api/views';
import { cn } from '../../ui/styles/cn';
import type { ForecastRow } from './forecastRows';
import styles from './TankStatus.module.css';

const LEVEL_DIGITS = 2;
/** Stroke widths and sizes of the chart, in pixels (presentation only). */
const MEDIAN_STROKE_WIDTH = 3;
const EDGE_STROKE_WIDTH = 1;
const BAND_FILL_OPACITY = 0.6;
const MARKER_RADIUS = 3;
const AXIS_TICK = { fontSize: 14 } as const;
const AXIS_WIDTH = 48;
const CHART_MARGIN = { top: 8, right: 16, bottom: 8, left: 0 } as const;
const EDGE_DASH = '4 4';
const RESERVE_STROKE_WIDTH = 2;
const MIN_TICK_GAP = 24;
const SELECTED_STROKE_WIDTH = 2;
const SOURCE_DASH = '8 6';
/** Token of each accent: the source decides the color, never a hex value here. */
const ACCENT_TOKENS = {
  water: { line: 'var(--color-water-700)', band: 'var(--color-water-300)' },
  ochre: { line: 'var(--color-ochre-700)', band: 'var(--color-ochre-100)' },
} as const;

interface ForecastChartProps {
  readonly tank: TankView;
  readonly rows: readonly ForecastRow[];
  /** Whether the forecast came from the simple estimate instead of the AI; null without forecast. */
  readonly isFallback: boolean | null;
  readonly bands: readonly RuleBand[];
  readonly reserveLevel: number | null;
  /** Day marked by the slider. */
  readonly selectedDayKey: string | null;
}

const LABEL_STYLE = { fontSize: 14 } as const;

/** One mark per whole meter, so the axis reads like the ruler of the tank. */
function wholeMeters(min: number, max: number): number[] {
  const marks: number[] = [];
  for (let mark = Math.ceil(min); mark <= max; mark += 1) {
    marks.push(mark);
  }
  return marks;
}

function formatLevel(value: number): string {
  return formatDecimal(value, LEVEL_DIGITS);
}

function Swatch({ className }: { readonly className: string }): JSX.Element {
  return <span aria-hidden="true" className={cn(styles.swatch, className)} />;
}

/**
 * The level read in the last days (a line), the expected level per day (p50) with its likely range
 * (p10 to p90), the reserve and the band limits over the tank's gauge. The same numbers are in a
 * folded table for people who cannot read the drawing.
 */
export function ForecastChart({
  tank,
  rows,
  isFallback,
  bands,
  reserveLevel,
  selectedDayKey,
}: ForecastChartProps): JSX.Element {
  const source = forecastSourceState(isFallback ?? false).presentation;
  const tokens = ACCENT_TOKENS[source.accent];
  const lineDash = source.lineDashed ? SOURCE_DASH : undefined;
  const hasForecast = rows.some((row) => row.p50 !== undefined);
  return (
    <div className={cn(styles.chartBlock)}>
      <div className={cn(styles.chartWrap)} role="img" aria-label={t('forecast.chartLabel')}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows.map((row) => ({ ...row }))} margin={CHART_MARGIN}>
            <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
            <XAxis
              dataKey="dayKey"
              tickFormatter={(value: string) => formatDayKey(value)}
              stroke="var(--color-text-secondary)"
              tick={AXIS_TICK}
              interval="preserveStartEnd"
              minTickGap={MIN_TICK_GAP}
            />
            <YAxis
              domain={[tank.gaugeMin, tank.gaugeMax]}
              ticks={wholeMeters(tank.gaugeMin, tank.gaugeMax)}
              tick={AXIS_TICK}
              tickFormatter={(value: number) => formatLevel(value)}
              stroke="var(--color-text-secondary)"
              width={AXIS_WIDTH}
            />
            <Tooltip
              labelFormatter={(value) => formatDayKey(String(value))}
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
              dataKey="observed"
              stroke="none"
              fill="var(--color-water-300)"
              fillOpacity={1}
              connectNulls
              legendType="none"
              isAnimationActive={false}
            />
            <Area
              dataKey="range"
              name={t('forecast.range')}
              stroke="none"
              fill={tokens.band}
              fillOpacity={BAND_FILL_OPACITY}
              isAnimationActive={false}
            />
            {bands
              .filter((band) => band.minLevel > tank.gaugeMin)
              .map((band) => (
                <ReferenceLine
                  key={band.band}
                  y={band.minLevel}
                  stroke="var(--color-border-strong)"
                  strokeDasharray={EDGE_DASH}
                  ifOverflow="extendDomain"
                  label={{
                    value: t('forecast.bandStarts', {
                      band: bandLabel(band.band),
                      level: formatLevel(band.minLevel),
                    }),
                    position: 'insideTopLeft',
                    fill: 'var(--color-text-secondary)',
                    ...LABEL_STYLE,
                  }}
                />
              ))}
            {reserveLevel === null ? null : (
              <ReferenceLine
                y={reserveLevel}
                stroke="var(--color-clay-700)"
                strokeWidth={RESERVE_STROKE_WIDTH}
                strokeDasharray={SOURCE_DASH}
                label={{
                  value: t('forecast.reserveLine', { level: formatLevel(reserveLevel) }),
                  position: 'insideTopLeft',
                  fill: 'var(--color-clay-700)',
                  ...LABEL_STYLE,
                }}
              />
            )}
            {selectedDayKey === null ? null : (
              <ReferenceLine
                x={selectedDayKey}
                stroke="var(--color-text-primary)"
                strokeWidth={SELECTED_STROKE_WIDTH}
              />
            )}
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
              stroke={tokens.line}
              strokeWidth={MEDIAN_STROKE_WIDTH}
              strokeDasharray={lineDash}
              dot={{ r: MARKER_RADIUS, fill: tokens.line }}
              isAnimationActive={false}
            />
            <Line
              dataKey="observed"
              name={t('forecast.observed')}
              stroke="var(--color-text-primary)"
              strokeWidth={MEDIAN_STROKE_WIDTH}
              connectNulls
              dot={{ r: MARKER_RADIUS, fill: 'var(--color-text-primary)' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className={cn(styles.legend)}>
        <li>
          <Swatch className={cn(styles.swatchRead)} />
          {t('forecast.observed')}
        </li>
        {hasForecast ? (
          <>
            <li>
              <Swatch
                className={cn(styles.swatchMedian, isFallback === true && styles.swatchEstimate)}
              />
              {t('forecast.median')}
            </li>
            <li>
              <Swatch
                className={cn(styles.swatchRange, isFallback === true && styles.swatchEstimate)}
              />
              {t('forecast.range')}
            </li>
          </>
        ) : null}
        {reserveLevel === null ? null : (
          <li>
            <Swatch className={cn(styles.swatchReserve)} />
            {t('forecast.legendReserve')}
          </li>
        )}
        <li>
          <Swatch className={cn(styles.swatchLimit)} />
          {t('forecast.legendLimits')}
        </li>
      </ul>
      <details className={cn(styles.numbers)}>
        <summary>{t('forecast.showNumbers')}</summary>
        <table className={cn(styles.pointsTable)}>
          <caption>{t('forecast.tableCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('forecast.day')}</th>
              <th scope="col">{t('forecast.observed')}</th>
              <th scope="col">{t('forecast.p10')}</th>
              <th scope="col">{t('forecast.p50')}</th>
              <th scope="col">{t('forecast.p90')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.dayKey}>
                <th scope="row">{formatDayKey(row.dayKey)}</th>
                <td>{row.observed === undefined ? '-' : formatLevel(row.observed)}</td>
                <td>{row.p10 === undefined ? '-' : formatLevel(row.p10)}</td>
                <td>{row.p50 === undefined ? '-' : formatLevel(row.p50)}</td>
                <td>{row.p90 === undefined ? '-' : formatLevel(row.p90)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
