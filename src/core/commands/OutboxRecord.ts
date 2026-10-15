/** Kinds of queued command. Each kind has one payload shape and one endpoint (offline-sync.md 3). */
export type OutboxKind = 'SUBMIT_READING';

/** Life of a queued item (offline-sync.md 4). */
export type OutboxStatus =
  'PENDING' | 'SENDING' | 'CORRECTION_PENDING' | 'BLOCKED_OTHER_USER' | 'BLOCKED_NO_PERMISSION';

/** The account and aqueduct that own a queued item. Only that owner sends or sees it. */
export interface OutboxOwner {
  readonly userId: string;
  readonly aqueductId: string;
}

/**
 * A queued command as stored in IndexedDB: plain data only, no tokens, cookies or passwords.
 */
export interface OutboxRecord extends OutboxOwner {
  readonly clientId: string;
  readonly kind: OutboxKind;
  status: OutboxStatus;
  readonly payload: unknown;
  /** ISO-8601 with offset, phone clock at capture time. */
  readonly createdAt: string;
  /** Rule set version the reading was captured with; null when it was not known offline. */
  readonly ruleSetVersionId: string | null;
  attempts: number;
  /** Epoch milliseconds of the next attempt, or null when it can go right away. */
  nextAttemptAtMs: number | null;
  lastErrorCode: string | null;
  lastErrorAtMs: number | null;
}
