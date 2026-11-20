import { formatDecimal } from '../../core/format/decimal';
import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import type { ForecastRow } from './forecastRows';

const LEVEL_DIGITS = 2;

/** What the slider shows for one chosen day: a reading or a forecast with its likely range. */
export interface DaySelection {
  readonly dayKey: string;
  readonly level: number;
  readonly isForecast: boolean;
  readonly rangeLow?: number;
  readonly rangeHigh?: number;
}

/** A day with a reading is read; a day with only the forecast is an estimate. */
export function selectionOf(row: ForecastRow): DaySelection | null {
  if (row.observed !== undefined) {
    return { dayKey: row.dayKey, level: row.observed, isForecast: false };
  }
  if (row.p50 !== undefined && row.p10 !== undefined && row.p90 !== undefined) {
    return {
      dayKey: row.dayKey,
      level: row.p50,
      isForecast: true,
      rangeLow: row.p10,
      rangeHigh: row.p90,
    };
  }
  return null;
}

/** The plain sentence for the chosen day, also used as the slider's spoken value. */
export function selectionText(selection: DaySelection): string {
  const day = formatDayKey(selection.dayKey);
  if (
    selection.isForecast &&
    selection.rangeLow !== undefined &&
    selection.rangeHigh !== undefined
  ) {
    return t('tankStatus.timelineForecast', {
      day,
      median: formatDecimal(selection.level, LEVEL_DIGITS),
      low: formatDecimal(selection.rangeLow, LEVEL_DIGITS),
      high: formatDecimal(selection.rangeHigh, LEVEL_DIGITS),
    });
  }
  return t('tankStatus.timelinePast', {
    day,
    level: formatDecimal(selection.level, LEVEL_DIGITS),
  });
}

/** Index of the day the slider starts on: the day of the last reading. */
export function defaultIndexOf(
  rows: readonly ForecastRow[],
  observedDayKey: string | null,
): number {
  const byDay = rows.findIndex((row) => row.dayKey === observedDayKey);
  if (byDay >= 0) {
    return byDay;
  }
  const lastRead = rows.findLastIndex((row) => row.observed !== undefined);
  return Math.max(0, lastRead);
}
