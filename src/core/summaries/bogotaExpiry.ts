import { BOGOTA_OFFSET } from '../format/bogotaDay';

const LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;

/**
 * Turns the value of a `datetime-local` field (2026-11-30T23:59, read in America/Bogota) into an
 * ISO-8601 instant with its offset, the form the API expects for `expires_at` (API.md 1.1).
 * Returns null when the value is not a complete date and time.
 */
export function bogotaLocalToIso(local: string): string | null {
  const match = LOCAL_DATE_TIME.exec(local.trim());
  if (match === null) {
    return null;
  }
  const [, day = '', time = ''] = match;
  return `${day}T${time}:00${BOGOTA_OFFSET}`;
}
