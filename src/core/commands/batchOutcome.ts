import type { SubmitOutcome } from './CommandQueue';
import { NETWORK_CODE, outcomeForCode } from './classifyFailure';

/** One item's answer inside POST /readings/batch (API.md 7.2). */
export interface BatchItemAnswer {
  readonly id: string;
  readonly status: string;
  readonly errorCode: string | null;
}

/** Statuses that mean the reading is on the server (a repeated send counts as saved). */
const SAVED_STATUSES: ReadonlySet<string> = new Set(['ACCEPTED', 'FLAGGED', 'REPLAYED']);
const REJECTED_STATUS = 'REJECTED';
/** Code used when the server refuses an item without saying why. */
const UNSPECIFIED_REFUSAL = 'VALIDATION_ERROR';
/** The batch itself was refused (400): every item in it is wrong for the server. */
const WHOLE_BATCH_INVALID_CODE = 'VALIDATION_ERROR';
const BATCH_REUSED_CODE = 'CONFLICT';

/** The queue outcome of one item. No answer for the item means it is sent again later. */
export function outcomeForAnswer(answer: BatchItemAnswer | undefined): SubmitOutcome {
  if (answer === undefined) {
    return { type: 'UNANSWERED' };
  }
  if (SAVED_STATUSES.has(answer.status)) {
    return { type: 'SAVED' };
  }
  if (answer.status === REJECTED_STATUS) {
    return outcomeForCode(answer.errorCode ?? UNSPECIFIED_REFUSAL);
  }
  return { type: 'RETRY', code: answer.status };
}

/** True when a whole-batch failure means the batch id was reused and a new batch must be sent. */
export function isBatchIdReused(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === BATCH_REUSED_CODE
  );
}

/** The outcome shared by every item of a batch the server refused as a whole. */
export function outcomeForWholeBatch(code: string | null): SubmitOutcome {
  if (code === WHOLE_BATCH_INVALID_CODE) {
    return outcomeForCode(WHOLE_BATCH_INVALID_CODE);
  }
  return { type: 'RETRY', code: code ?? NETWORK_CODE };
}
