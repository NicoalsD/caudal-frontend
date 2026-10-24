const SEPARATORS = /[\s-]/g;

/**
 * Cleans a tracking code as the person types it: spaces and hyphens are dropped and the letters
 * go to upper case. The alphabet of the code has no case, so "7k2m-9qaz" is the same code.
 */
export function normalizeTrackingCodeInput(raw: string): string {
  return raw.replace(SEPARATORS, '').toUpperCase();
}
