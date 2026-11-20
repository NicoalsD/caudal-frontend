import { addDays } from '../../core/reports/reportPeriod';
import type { ForecastRow } from './forecastRows';

export type PanoramaRange = 'today' | 'week' | 'month';

/** Days of history each range shows before today; the forecast always follows. */
const BACK_DAYS: Readonly<Record<PanoramaRange, number>> = { today: 2, week: 7, month: 30 };
/** A line needs two days to be a line. */
const MIN_ROWS = 2;

/**
 * Keeps the days from the start of the range on, and every forecast day. The range counts back
 * from today, or from the last reading when that is older (a stale tank still shows its level).
 * When the range leaves fewer than two days the whole series stays, so the chart never goes blank.
 */
export function rowsInRange(
  rows: readonly ForecastRow[],
  range: PanoramaRange,
  todayKey: string,
): readonly ForecastRow[] {
  const lastRead = rows.reduce<string | null>(
    (latest, row) =>
      row.observed !== undefined && (latest === null || row.dayKey > latest) ? row.dayKey : latest,
    null,
  );
  const anchor = lastRead !== null && lastRead < todayKey ? lastRead : todayKey;
  const start = addDays(anchor, -BACK_DAYS[range]);
  if (start === null) {
    return rows;
  }
  const kept = rows.filter((row) => row.dayKey >= start || row.p50 !== undefined);
  return kept.length >= MIN_ROWS ? kept : rows;
}
