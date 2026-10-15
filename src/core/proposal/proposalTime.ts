import { HOURS_PER_DAY } from '../policy/clientPolicy';
import { timeToMinutes } from '../rules/operatingWindows';
import type { OperatingWindow } from '../rules/ruleSetParts';

/** America/Bogota has no daylight saving time: a fixed offset of UTC-5 (API.md 1.1). */
export const BOGOTA_OFFSET = '-05:00';
const BOGOTA_OFFSET_MINUTES = -300;

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;
const MS_PER_MINUTE = 60_000;
const ISO_SUNDAY = 7;
const JS_SUNDAY = 0;
const PAD = 2;
const DAY_PART = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A window of the operating day, in minutes from midnight. */
export interface MinuteWindow {
  readonly startMinutes: number;
  readonly endMinutes: number;
}

/** ISO weekday of a YYYY-MM-DD day: 1 is Monday, 7 is Sunday (the rule set's day_of_week). */
export function isoWeekday(serviceDate: string): number {
  const match = DAY_PART.exec(serviceDate);
  if (match === null) {
    throw new RangeError(`Not a service date (YYYY-MM-DD): ${serviceDate}`);
  }
  const [, year = '', month = '', day = ''] = match;
  const jsDay = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay();
  return jsDay === JS_SUNDAY ? ISO_SUNDAY : jsDay;
}

/**
 * The operating windows that apply to a day: the ones of its weekday and the ones that apply
 * every day (day_of_week null). Times come out as minutes from midnight.
 */
export function windowsForDay(
  windows: readonly OperatingWindow[],
  serviceDate: string,
): MinuteWindow[] {
  const weekday = isoWeekday(serviceDate);
  const result: MinuteWindow[] = [];
  for (const window of windows) {
    if (window.dayOfWeek !== null && window.dayOfWeek !== weekday) {
      continue;
    }
    const startMinutes = timeToMinutes(window.start);
    const endMinutes = timeToMinutes(window.end);
    if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
      result.push({ startMinutes, endMinutes });
    }
  }
  return result;
}

/** ISO-8601 instant in America/Bogota for a day and a number of minutes from its midnight. */
export function toBogotaIso(serviceDate: string, minutesFromMidnight: number): string {
  const hours = Math.floor(minutesFromMidnight / MINUTES_PER_HOUR);
  const minutes = minutesFromMidnight % MINUTES_PER_HOUR;
  return `${serviceDate}T${pad(hours)}:${pad(minutes)}:00${BOGOTA_OFFSET}`;
}

/** Minutes from the midnight of America/Bogota for an instant (rounded to the minute). */
export function bogotaMinutesOf(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw new RangeError(`Not a valid ISO-8601 instant: ${iso}`);
  }
  const localMinutes = Math.round(ms / MS_PER_MINUTE) + BOGOTA_OFFSET_MINUTES;
  return ((localMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function pad(value: number): string {
  return String(value).padStart(PAD, '0');
}
