import { useId } from 'react';
import type { JSX } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import styles from './AreaTrend.module.css';

export interface TrendPoint {
  /** Text of the x axis and of the tooltip ("12 nov", "08:00"). */
  readonly label: string;
  readonly value: number;
}

interface AreaTrendProps {
  /** Describes the chart for assistive technology (its subject); a summary is added. */
  readonly title: string;
  readonly data: readonly TrendPoint[];
  /** Formats a value for the axis and the tooltip pill ("2,4 m"). */
  readonly formatValue: (value: number) => string;
  /** Fixed pixel height; the width fills the card. */
  readonly height?: number;
  /** Fixed pixel width, for tests and print; omit it to fill the container. */
  readonly width?: number;
}

const DEFAULT_HEIGHT = 220;
const AXIS_TICK = { fontSize: 13 } as const;
const MARGIN = { top: 16, right: 8, bottom: 0, left: 0 } as const;
const AXIS_WIDTH = 48;
const GRID_DASH = '3 6';
const STROKE_WIDTH = 2.5;
const ACTIVE_DOT = { r: 6, strokeWidth: 3 } as const;

interface PillProps {
  readonly active?: boolean;
  readonly payload?: readonly { readonly value?: number | string; readonly payload?: TrendPoint }[];
  readonly format: (value: number) => string;
}

/** Dark pill that floats over the hovered point (value and label). Exported for other charts. */
export function PillTooltip({ active, payload, format }: PillProps): JSX.Element | null {
  const point = payload?.[0];
  if (active !== true || point === undefined || typeof point.value !== 'number') {
    return null;
  }
  return (
    <div className={cn(styles.pill)}>
      <strong>{format(point.value)}</strong>
      {point.payload !== undefined && <span>{point.payload.label}</span>}
    </div>
  );
}

/**
 * Soft area chart: one line, gradient fill, dashed grid and a pill tooltip. The chart is a graphic
 * with a text summary; the values live in the screen's table or figures (dataviz rules).
 */
export function AreaTrend({
  title,
  data,
  formatValue,
  height = DEFAULT_HEIGHT,
  width,
}: AreaTrendProps): JSX.Element {
  const gradientId = useId();
  const values = data.map((point) => point.value);
  const summary =
    values.length === 0
      ? t('ui.chartNoData')
      : t('ui.chartSummary', {
          title,
          count: String(values.length),
          min: formatValue(Math.min(...values)),
          max: formatValue(Math.max(...values)),
        });
  const rows = [...data];
  const chart = (
    <AreaChart data={rows} margin={MARGIN} {...(width === undefined ? {} : { width, height })}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className={cn(styles.stopTop)} />
          <stop offset="100%" className={cn(styles.stopBottom)} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} strokeDasharray={GRID_DASH} className={cn(styles.grid)} />
      <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
      <YAxis
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={false}
        width={AXIS_WIDTH}
        tickFormatter={(value: number) => formatValue(value)}
      />
      <Tooltip
        cursor={{ className: styles.cursor ?? '' }}
        content={(props) => (
          <PillTooltip
            {...(props.active === undefined ? {} : { active: props.active })}
            payload={(props.payload ?? []) as PillProps['payload'] & object}
            format={formatValue}
          />
        )}
      />
      <Area
        type="monotone"
        dataKey="value"
        className={cn(styles.area)}
        strokeWidth={STROKE_WIDTH}
        fill={`url(#${gradientId})`}
        activeDot={{ ...ACTIVE_DOT, className: styles.dot ?? '' }}
        isAnimationActive={false}
      />
    </AreaChart>
  );
  return (
    <figure className={cn(styles.figure)} style={{ height }}>
      <div role="img" aria-label={summary} className={cn(styles.plot)}>
        {width === undefined ? (
          <ResponsiveContainer width="100%" height="100%">
            {chart}
          </ResponsiveContainer>
        ) : (
          chart
        )}
      </div>
    </figure>
  );
}
