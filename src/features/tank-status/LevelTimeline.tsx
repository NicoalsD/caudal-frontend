import type { JSX } from 'react';
import { Calculator } from 'lucide-react';

import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import type { ForecastRow } from './forecastRows';
import { selectionOf, selectionText } from './levelTimeline';
import styles from './LevelTimeline.module.css';

/** Fewer days than this and there is nothing to move through. */
const MIN_DAYS = 2;
const PERCENT = 100;

interface LevelTimelineProps {
  readonly rows: readonly ForecastRow[];
  readonly index: number;
  readonly defaultIndex: number;
  /** Position of the service day among the rows, or -1 when it is not drawn. */
  readonly todayIndex: number;
  readonly onChange: (index: number) => void;
  /** True over a dark panel (the tank stage): light track, thumb and text. */
  readonly onDark?: boolean;
}

/** The slider that moves the tank and the chart through the days of history and forecast. */
export function LevelTimeline({
  rows,
  index,
  defaultIndex,
  todayIndex,
  onChange,
  onDark = false,
}: LevelTimelineProps): JSX.Element | null {
  const row = rows[index];
  const selection = row === undefined ? null : selectionOf(row);
  if (rows.length < MIN_DAYS || row === undefined || selection === null) {
    return null;
  }
  const last = rows.length - 1;
  const text = selectionText(selection);
  const todayAt = todayIndex >= 0 ? (todayIndex / last) * PERCENT : null;
  return (
    <div className={cn(styles.timeline, onDark && styles.onDark)}>
      <input
        className={cn(styles.range)}
        type="range"
        min={0}
        max={last}
        step={1}
        value={index}
        aria-label={t('tankStatus.timelineLabel')}
        aria-valuetext={text}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      />
      <div className={cn(styles.scale)} aria-hidden="true">
        <span>{formatDayKey(rows[0]?.dayKey ?? selection.dayKey)}</span>
        {todayAt === null ? null : (
          <span className={cn(styles.today)} style={{ insetInlineStart: `${String(todayAt)}%` }}>
            {t('tankStatus.timelineToday')}
          </span>
        )}
        <span>{formatDayKey(rows[last]?.dayKey ?? selection.dayKey)}</span>
      </div>
      <p className={cn(styles.sentence)} role="status">
        {selection.isForecast ? (
          <span className={cn(styles.chip)}>
            <Calculator aria-hidden="true" className={cn(styles.chipIcon)} />
            {t('tankStatus.timelineEstimate')}
          </span>
        ) : null}
        {text}
      </p>
      {index === defaultIndex ? null : (
        <Button
          onClick={() => {
            onChange(defaultIndex);
          }}
        >
          {t('tankStatus.timelineBack')}
        </Button>
      )}
    </div>
  );
}
