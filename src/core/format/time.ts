import { DISPLAY_LOCALE, DISPLAY_TIME_ZONE } from '../policy/clientPolicy';

const DATE_PARTS = { day: 'numeric', month: 'short', year: 'numeric' } as const;
const TIME_PARTS = { hour: 'numeric', minute: '2-digit' } as const;

const dateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  timeZone: DISPLAY_TIME_ZONE,
  ...DATE_PARTS,
});

const timeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  timeZone: DISPLAY_TIME_ZONE,
  ...TIME_PARTS,
});

const dateTimeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  timeZone: DISPLAY_TIME_ZONE,
  ...DATE_PARTS,
  ...TIME_PARTS,
});

/** en-CA writes dates as YYYY-MM-DD, the format of `service_date` in the API. */
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Parses an ISO-8601 instant; throws RangeError if it is not valid. */
export function parseInstant(iso: string): Date {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Not a valid ISO-8601 instant: ${iso}`);
  }
  return date;
}

/** "9 de oct de 2026" in America/Bogota, whatever the device time zone is. */
export function formatDate(iso: string): string {
  return dateFormatter.format(parseInstant(iso));
}

/** "8:00 a. m." in America/Bogota. */
export function formatTime(iso: string): string {
  return timeFormatter.format(parseInstant(iso));
}

/** "9 de oct de 2026, 8:00 a. m." in America/Bogota. */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(parseInstant(iso));
}

/** The calendar day of an instant in America/Bogota as YYYY-MM-DD. */
export function toBogotaDateKey(iso: string): string {
  return dateKeyFormatter.format(parseInstant(iso));
}
