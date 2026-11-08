import type { JSX } from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import styles from './BarChart.module.css';

/** A series of bars. The color is a CSS token, never a hex value, so the theme decides it. */
export interface BarSeries {
  readonly key: string;
  readonly label: string;
  readonly token: string;
}

export interface BarRow {
  readonly name: string;
  readonly values: Readonly<Record<string, number>>;
}

/** Tokens in the order series take them when the caller does not choose. */
export const SERIES_COLOR = {
  water: 'var(--color-water-700)',
  ochre: 'var(--color-ochre-700)',
  clay: 'var(--color-clay-700)',
  paramo: 'var(--color-paramo-800)',
} as const;

export const SERIES_TOKENS = Object.values(SERIES_COLOR);

const AXIS_TICK = { fontSize: 13 } as const;
const MARGIN = { top: 8, right: 8, bottom: 8, left: 0 } as const;
const AXIS_WIDTH = 40;
const CORNER = 3;
const BAR_RADIUS: [number, number, number, number] = [CORNER, CORNER, 0, 0];
const STACK = 'stack';

interface BarChartProps {
  /** Names the chart for assistive technology and heads the table of numbers. */
  readonly label: string;
  readonly rows: readonly BarRow[];
  readonly series: readonly BarSeries[];
  readonly stacked?: boolean;
  /** Text for the numbers' table; defaults to "Ver los números". */
  readonly formatValue?: (value: number) => string;
}

/**
 * Bars with an alternative: the drawing is an image for assistive technology and the same numbers
 * sit in a table under "Ver los números" (and open on paper). With no rows it says so.
 */
export function BarChart({
  label,
  rows,
  series,
  stacked = false,
  formatValue = String,
}: BarChartProps): JSX.Element {
  if (rows.length === 0) {
    return (
      <figure className={cn(styles.figure)}>
        <figcaption className={cn(styles.caption)}>{label}</figcaption>
        <p className={cn(styles.empty)}>{t('charts.noData')}</p>
      </figure>
    );
  }
  const data = rows.map((row) => ({ name: row.name, ...row.values }));
  return (
    <figure className={cn(styles.figure)}>
      <figcaption className={cn(styles.caption)}>{label}</figcaption>
      <div className={cn(styles.plot)} role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height={192}>
          <RechartsBarChart data={data} margin={MARGIN}>
            <CartesianGrid
              stroke="var(--color-border-subtle)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={AXIS_TICK}
              stroke="var(--color-text-secondary)"
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={AXIS_TICK}
              stroke="var(--color-text-secondary)"
              width={AXIS_WIDTH}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-raised)',
                border: '1px solid var(--color-border-strong)',
                color: 'var(--color-text-primary)',
              }}
            />
            {series.map((item) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                fill={item.token}
                radius={BAR_RADIUS}
                isAnimationActive={false}
                {...(stacked ? { stackId: STACK } : {})}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 ? (
        <ul className={cn(styles.legend)}>
          {series.map((item) => (
            <li key={item.key}>
              <span
                aria-hidden="true"
                className={cn(styles.swatch)}
                style={{ background: item.token }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
      <details className={cn(styles.numbers)}>
        <summary>{t('charts.showNumbers')}</summary>
        <table className={cn(styles.table)}>
          <caption className={cn(styles.srOnly)}>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{t('charts.category')}</th>
              {series.map((item) => (
                <th key={item.key} scope="col">
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                {series.map((item) => (
                  <td key={item.key}>{formatValue(row.values[item.key] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
