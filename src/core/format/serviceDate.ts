import { DISPLAY_LOCALE } from '../policy/clientPolicy';

/** YYYY-MM-DD, the day of service the API sends (no time, no zone). */
const SERVICE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_OFFSET = 1;

/**
 * Formats a service day such as "2026-10-01" as "jueves, 1 de octubre". The day is built in UTC
 * so a device in another zone never shows the day before. It is not an instant: no zone applies.
 */
const dayFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function formatServiceDate(dateKey: string): string {
  const match = SERVICE_DATE.exec(dateKey);
  if (match === null) {
    throw new RangeError(`Not a service date (YYYY-MM-DD): ${dateKey}`);
  }
  const [, year = '', month = '', day = ''] = match;
  const utcMs = Date.UTC(Number(year), Number(month) - MONTH_OFFSET, Number(day));
  if (Number.isNaN(utcMs) || new Date(utcMs).getUTCDate() !== Number(day)) {
    throw new RangeError(`Not a valid calendar day: ${dateKey}`);
  }
  return dayFormatter.format(utcMs);
}
