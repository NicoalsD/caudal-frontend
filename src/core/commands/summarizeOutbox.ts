import type { ClosedItem } from './CommandQueue';
import type { OutboxRecord, OutboxStatus, RejectionDetails } from './OutboxRecord';
import { readSubmitReadingPayload } from './SubmitReadingCommand';

/** One queued reading as the screens show it. Values come from the stored payload. */
export interface OutboxItemSummary {
  readonly clientId: string;
  readonly status: OutboxStatus;
  readonly attempts: number;
  readonly lastErrorCode: string | null;
  readonly lastErrorDetails: RejectionDetails | null;
  readonly createdAt: string;
  /** Null when the stored payload is corrupt: the item is then marked for correction. */
  readonly gaugeValue: number | null;
  readonly observedAt: string | null;
  readonly tankId: string | null;
}

/** A reading that left the queue during this session: sent, or discarded with its reason. */
export interface ClosedItemSummary {
  readonly clientId: string;
  readonly outcome: ClosedItem['outcome'];
  readonly gaugeValue: number | null;
  readonly observedAt: string | null;
  readonly reason: string | null;
}

/** What the person needs to know about the queue: counts and each item's status. */
export interface OutboxSummary {
  /** Waiting or being sent: they have not reached the server yet. */
  readonly pendingCount: number;
  readonly sendingCount: number;
  /** Refused by the server or broken on the phone: the person must correct them. */
  readonly needsReviewCount: number;
  readonly items: readonly OutboxItemSummary[];
  /** Sent or discarded during this session, oldest first. */
  readonly closed: readonly ClosedItemSummary[];
}

const SENDING_STATUS = 'SENDING';
const REVIEW_STATUSES: readonly OutboxStatus[] = ['CORRECTION_PENDING'];

function summarizeItem(record: OutboxRecord): OutboxItemSummary {
  const payload = readSubmitReadingPayload(record.payload);
  return {
    clientId: record.clientId,
    status: record.status,
    attempts: record.attempts,
    lastErrorCode: record.lastErrorCode,
    lastErrorDetails: record.lastErrorDetails ?? null,
    createdAt: record.createdAt,
    gaugeValue: payload?.gaugeValue ?? null,
    observedAt: payload?.observedAt ?? null,
    tankId: payload?.tankId ?? null,
  };
}

function summarizeClosed(item: ClosedItem): ClosedItemSummary {
  const payload = readSubmitReadingPayload(item.payload);
  return {
    clientId: item.clientId,
    outcome: item.outcome,
    gaugeValue: payload?.gaugeValue ?? null,
    observedAt: payload?.observedAt ?? null,
    reason: item.reason,
  };
}

/** Counts the records of one owner. `records` are the unsent and the ones to review. */
export function summarizeOutbox(
  records: readonly OutboxRecord[],
  closed: readonly ClosedItem[] = [],
): OutboxSummary {
  return {
    pendingCount: records.filter((record) => !REVIEW_STATUSES.includes(record.status)).length,
    sendingCount: records.filter((record) => record.status === SENDING_STATUS).length,
    needsReviewCount: records.filter((record) => REVIEW_STATUSES.includes(record.status)).length,
    items: records.map((record) => summarizeItem(record)),
    closed: closed.map((item) => summarizeClosed(item)),
  };
}
