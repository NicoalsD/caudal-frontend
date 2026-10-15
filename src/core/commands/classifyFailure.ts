import { DomainError } from '../errors/DomainError';
import { NetworkError } from '../errors/NetworkError';
import type { SubmitOutcome } from './CommandQueue';

/** Codes that refuse a reading for good: the server did not store it and it never will as sent. */
const REJECTION_CODES: ReadonlySet<string> = new Set([
  'GAUGE_OUT_OF_RANGE',
  'MISSING_TIMESTAMP',
  'FUTURE_TIMESTAMP',
  'TOO_OLD',
  'NOT_FOUND',
  'DUPLICATE_READING',
  'VALIDATION_ERROR',
]);

/** Code used when the stored data itself is broken. */
export const LOCAL_CORRUPT_CODE = 'LOCAL_CORRUPT';
/** Code used when there was no answer at all. */
export const NETWORK_CODE = 'NETWORK';

/**
 * Maps a failed send to the queue outcome (offline-sync.md section 5). A refusal with a known code
 * needs the person; anything else (no answer, 5xx, unknown codes) is sent again later.
 */
export function classifyFailure(error: unknown): SubmitOutcome {
  if (error instanceof DomainError && REJECTION_CODES.has(error.code)) {
    return { type: 'REJECTED', code: error.code };
  }
  if (error instanceof DomainError) {
    return { type: 'RETRY', code: error.code };
  }
  if (error instanceof NetworkError) {
    return { type: 'RETRY', code: NETWORK_CODE };
  }
  return { type: 'RETRY', code: NETWORK_CODE };
}
