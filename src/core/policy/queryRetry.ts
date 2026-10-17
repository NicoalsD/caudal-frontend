import { NetworkError } from '../errors/NetworkError';
import { httpStatusOf } from '../errors/httpInfo';
import {
  CLIENT_ERROR_MIN_STATUS,
  QUERY_RETRY_COUNT,
  SERVER_ERROR_MIN_STATUS,
  SERVER_UNAVAILABLE_STATUSES,
  SERVER_WAKE_QUERY_RETRIES,
  SERVER_WAKE_RETRY_BASE_DELAY_MS,
  SERVER_WAKE_RETRY_MAX_DELAY_MS,
} from './clientPolicy';

const BACKOFF_FACTOR = 2;

/** No answer at all, or a proxy saying the server is not up: the server may be waking up. */
export function isServerUnreachable(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }
  const status = httpStatusOf(error);
  return status !== null && SERVER_UNAVAILABLE_STATUSES.includes(status);
}

/**
 * Whether a failed query tries again (architecture.md 6.1). A 4xx never does: the answer would be
 * the same. An unreachable server is retried for as long as it takes to wake up, but only while
 * the browser is online; offline, the screen shows its offline state right away.
 */
export function shouldRetryQuery(failureCount: number, error: unknown, online: boolean): boolean {
  const status = httpStatusOf(error);
  if (status !== null && status >= CLIENT_ERROR_MIN_STATUS && status < SERVER_ERROR_MIN_STATUS) {
    return false;
  }
  if (online && isServerUnreachable(error)) {
    return failureCount < SERVER_WAKE_QUERY_RETRIES;
  }
  return failureCount < QUERY_RETRY_COUNT;
}

/**
 * Wait before the next attempt of a query: doubles from two seconds up to five, so a screen loads
 * a few seconds after the server is up again.
 */
export function queryRetryDelayMs(failureCount: number): number {
  return Math.min(
    SERVER_WAKE_RETRY_BASE_DELAY_MS * BACKOFF_FACTOR ** failureCount,
    SERVER_WAKE_RETRY_MAX_DELAY_MS,
  );
}
