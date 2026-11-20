import type { JSX } from 'react';

import { strings } from '../../i18n/es';
import { cn } from '../../ui/styles/cn';
import { DEMO_FORECAST } from './demo';
import { SimulatedTag } from './Frames';
import styles from './ForecastFigure.module.css';
import { useReveal } from './useReveal';

const copy = strings.landing.forecast;

/** Drawing box of the chart, in SVG units. */
const WIDTH = 960;
const HEIGHT = 300;
const PADDING = 24;

const { observed, likely, low, high, simple, gaugeMax } = DEMO_FORECAST;
/** Days on the axis: the observed ones and the forecast ones share today's point. */
const DAYS = observed.length + likely.length - 1;
const TODAY = observed.length - 1;

const PLOT_WIDTH = WIDTH - PADDING - PADDING;
const PLOT_HEIGHT = HEIGHT - PADDING - PADDING;
const DOT_RADIUS = 8;

function x(day: number): number {
  return PADDING + (day / (DAYS - 1)) * PLOT_WIDTH;
}

function y(level: number): number {
  return HEIGHT - PADDING - (level / gaugeMax) * PLOT_HEIGHT;
}

function line(values: readonly number[], firstDay: number): string {
  return values
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${x(firstDay + index)},${y(value)}`)
    .join(' ');
}

function band(): string {
  const top = high.map((value, index) => `${x(TODAY + index)},${y(value)}`);
  const bottom = low.map((value, index) => `${x(TODAY + index)},${y(value)}`).reverse();
  return `M${top.join(' L')} L${bottom.join(' L')} Z`;
}

/**
 * Sample forecast in the shape of forecast-visualization.md: the observed line, the likely line
 * with its range, and the simple estimate dashed in ochre. It draws itself once when it is seen.
 */
export function ForecastFigure(): JSX.Element {
  const [ref, seen] = useReveal<HTMLElement>();

  return (
    <figure ref={ref} className={cn(styles.figure)} data-seen={seen}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={cn(styles.chart)}
        role="img"
        aria-label={copy.chartLabel}
      >
        <line className={cn(styles.ground)} x1={0} x2={WIDTH} y1={y(0)} y2={y(0)} />
        <line className={cn(styles.today)} x1={x(TODAY)} x2={x(TODAY)} y1={PADDING} y2={y(0)} />
        <path className={cn(styles.range)} d={band()} />
        <path className={cn(styles.observed)} d={line(observed, 0)} pathLength={1} />
        <path className={cn(styles.simple)} d={line(simple, TODAY)} />
        <path className={cn(styles.likely)} d={line(likely, TODAY)} pathLength={1} />
        <circle className={cn(styles.dot)} cx={x(TODAY)} cy={y(likely[0] ?? 0)} r={DOT_RADIUS} />
      </svg>
      <figcaption className={cn(styles.legend)}>
        <span className={cn(styles.key, styles.keyObserved)}>{copy.legendObserved}</span>
        <span className={cn(styles.key, styles.keyLikely)}>{copy.legendLikely}</span>
        <span className={cn(styles.key, styles.keyRange)}>{copy.legendRange}</span>
        <span className={cn(styles.key, styles.keySimple)}>{copy.legendSimple}</span>
        <SimulatedTag className={cn(styles.tag)} />
      </figcaption>
    </figure>
  );
}
