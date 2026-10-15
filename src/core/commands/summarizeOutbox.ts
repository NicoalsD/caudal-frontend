import type { OutboxRecord, OutboxStatus } from './OutboxRecord';

/** One queued reading as the status bar shows it. */
export interface OutboxItemSummary {
  readonly clientId: string;
  readonly status: OutboxStatus;
  readonly attempts: number;
  readonly lastErrorCode: string | null;
}

/** What the person needs to know about the queue: counts and each item's status. */
export interface OutboxSummary {
  /** Waiting or being sent: they have not reached the server yet. */
  readonly pendingCount: number;
  readonly sendingCount: number;
  /** Refused by the server or broken on the phone: the person must correct them. */
  readonly needsReviewCount: number;
  readonly items: readonly OutboxItemSummary[];
}

const SENDING_STATUS = 'SENDING';
const REVIEW_STATUSES: readonly OutboxStatus[] = ['CORRECTION_PENDING'];

/** Counts the records of one owner. `records` are the unsent and the ones to review. */
export function summarizeOutbox(records: readonly OutboxRecord[]): OutboxSummary {
  const items = records.map((record) => ({
    clientId: record.clientId,
    status: record.status,
    attempts: record.attempts,
    lastErrorCode: record.lastErrorCode,
  }));
  return {
    pendingCount: records.filter((record) => !REVIEW_STATUSES.includes(record.status)).length,
    sendingCount: records.filter((record) => record.status === SENDING_STATUS).length,
    needsReviewCount: records.filter((record) => REVIEW_STATUSES.includes(record.status)).length,
    items,
  };
}
