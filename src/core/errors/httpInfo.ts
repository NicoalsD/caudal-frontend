const SECONDS_PER_MINUTE = 60;

function numberProperty(error: unknown, name: string): number | null {
  if (typeof error !== 'object' || error === null || !(name in error)) {
    return null;
  }
  const value = (error as Record<string, unknown>)[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * HTTP status carried by a transport error, or null for anything else. Duck typed on purpose:
 * features and state read it without importing the HTTP layer.
 */
export function httpStatusOf(error: unknown): number | null {
  return numberProperty(error, 'status');
}

/** Seconds from the Retry-After header of a 429 answer, or null. */
export function retryAfterSecondsOf(error: unknown): number | null {
  return numberProperty(error, 'retryAfterSeconds');
}

/** Whole minutes to wait, rounded up and never below one, for a message to the person. */
export function minutesToWait(retryAfterSeconds: number): number {
  return Math.max(1, Math.ceil(retryAfterSeconds / SECONDS_PER_MINUTE));
}
