/** Kinds of queued command. Each kind has one payload shape and one endpoint (offline-sync.md 3). */
export type OutboxKind = 'SUBMIT_READING';

/** Life of a queued item (offline-sync.md 4). */
export type OutboxStatus =
  'PENDING' | 'SENDING' | 'CORRECTION_PENDING' | 'BLOCKED_OTHER_USER' | 'BLOCKED_NO_PERMISSION';

/**
 * A queued command as stored in IndexedDB: plain data only. The owner (`userId`, `aqueductId`)
 * travels with the item so another account on the same phone never sends or sees it.
 */
export interface OutboxRecord {
  readonly clientId: string;
  readonly kind: OutboxKind;
  status: OutboxStatus;
  readonly userId: string;
  readonly aqueductId: string;
  readonly payload: unknown;
  /** ISO-8601 with offset, phone clock at capture time. */
  readonly createdAt: string;
  readonly ruleSetVersionId: string;
  attempts: number;
  /** Epoch milliseconds of the next attempt, or null when it can go right away. */
  nextAttemptAtMs: number | null;
  lastErrorCode: string | null;
  lastErrorAtMs: number | null;
}
