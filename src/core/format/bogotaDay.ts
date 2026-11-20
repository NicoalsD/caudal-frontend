/** Colombia has no daylight saving time: America/Bogota is always UTC-5. */
export const BOGOTA_OFFSET = '-05:00';
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;
const START_OF_DAY = '00:00:00';
const END_OF_DAY = '23:59:59';

function atBogotaTime(day: string, time: string): string | null {
  return CALENDAR_DAY.test(day) ? `${day}T${time}${BOGOTA_OFFSET}` : null;
}

/** 00:00:00 of a calendar day (YYYY-MM-DD) in America/Bogota as an ISO instant, or null. */
export function bogotaDayStart(day: string): string | null {
  return atBogotaTime(day, START_OF_DAY);
}

/** 23:59:59 of a calendar day (YYYY-MM-DD) in America/Bogota as an ISO instant, or null. */
export function bogotaDayEnd(day: string): string | null {
  return atBogotaTime(day, END_OF_DAY);
}
