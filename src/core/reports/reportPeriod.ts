import { bogotaDayStart } from '../format/bogotaDay';

/** The most days a report may cover (API.md 20.9); the server answers 400 beyond it. */
export const REPORT_MAX_DAYS = 92;
/** Days of the weekly figures on the Board's overview. */
export const WEEK_DAYS = 7;
/** Days of the default period of the reports page. */
export const DEFAULT_REPORT_DAYS = 30;

const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
const MONTH_OFFSET = 1;
const ISO_DAY_LENGTH = 10;

function dayNumber(dayKey: string): number | null {
  const match = CALENDAR_DAY.exec(dayKey);
  if (match === null) {
    return null;
  }
  const [, year = '', month = '', day = ''] = match;
  const ms = Date.UTC(Number(year), Number(month) - MONTH_OFFSET, Number(day));
  return Number.isNaN(ms) ? null : ms / MS_PER_DAY;
}

/** The calendar day `offset` days from `dayKey` (YYYY-MM-DD), or null if it is not a day. */
export function addDays(dayKey: string, offset: number): string | null {
  const start = dayNumber(dayKey);
  return start === null
    ? null
    : new Date((start + offset) * MS_PER_DAY).toISOString().slice(0, ISO_DAY_LENGTH);
}

export type PeriodProblem = 'incomplete' | 'inverted' | 'tooLong';

/**
 * Checks the two calendar days the person picked (both inclusive) before asking the server: it is
 * the same rule, said earlier and in plain words.
 */
export function periodProblem(fromDay: string, toDay: string): PeriodProblem | null {
  const from = dayNumber(fromDay);
  const to = dayNumber(toDay);
  if (from === null || to === null) {
    return 'incomplete';
  }
  if (to < from) {
    return 'inverted';
  }
  return to - from + 1 > REPORT_MAX_DAYS ? 'tooLong' : null;
}

/**
 * The instants the API wants for two inclusive calendar days: midnight in Bogotá of the first, and
 * midnight of the day after the last (`to` is exclusive). Null when a day is not a day.
 */
export function reportInstants(
  fromDay: string,
  toDay: string,
): { readonly from: string; readonly to: string } | null {
  const after = addDays(toDay, 1);
  const from = bogotaDayStart(fromDay);
  const to = after === null ? null : bogotaDayStart(after);
  return from === null || to === null ? null : { from, to };
}

/** The last `days` days ending on `todayKey`, both inclusive. */
export function lastDays(todayKey: string, days: number): { from: string; to: string } | null {
  const from = addDays(todayKey, 1 - days);
  return from === null ? null : { from, to: todayKey };
}
