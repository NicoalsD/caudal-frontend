import type { CommandQueue } from '../core/commands/CommandQueue';
import {
  isBatchIdReused,
  outcomeForAnswer,
  outcomeForWholeBatch,
} from '../core/commands/batchOutcome';
import type { SubmitOutcome } from '../core/commands/CommandQueue';
import { LOCAL_CORRUPT_CODE } from '../core/commands/classifyFailure';
import type { OutboxOwner, OutboxRecord } from '../core/commands/OutboxRecord';
import { readSubmitReadingPayload } from '../core/commands/SubmitReadingCommand';
import type { SubmitReadingPayload } from '../core/commands/SubmitReadingCommand';
import { DomainError } from '../core/errors/DomainError';
import type { IdGenerator } from '../core/ids/IdGenerator';
import { OUTBOX_BATCH_SIZE } from '../core/policy/clientPolicy';
import type { Clock } from '../core/time/Clock';
import type {
  ReadingBatchInput,
  ReadingBatchResultView,
  ReadingInput,
} from '../services/api/views';

/** What the sync needs from the API: the batch endpoint of the facade. */
export interface ReadingBatchSubmitter {
  submitBatch(input: ReadingBatchInput): Promise<ReadingBatchResultView>;
}

export interface FlushOptions {
  /** True when the connection has just come back: items waiting for their backoff go now. */
  readonly ignoreBackoff?: boolean;
}

interface Ready {
  readonly record: OutboxRecord;
  readonly payload: SubmitReadingPayload;
}

/**
 * Sends the signed-in owner's queued readings in batches (offline-sync.md section 6) and settles
 * each one with the server's answer. One flush runs at a time: a call while one runs shares it.
 * Items that the server refuses are kept for correction and never sent again by themselves.
 */
export class OutboxSync {
  private inFlight: Promise<void> | null = null;

  constructor(
    private readonly queue: CommandQueue,
    private readonly submitter: ReadingBatchSubmitter,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly currentOwner: () => OutboxOwner | null,
  ) {}

  flush(options: FlushOptions = {}): Promise<void> {
    this.inFlight ??= this.sendDue(options).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async sendDue(options: FlushOptions): Promise<void> {
    const owner = this.currentOwner();
    if (owner === null) {
      return;
    }
    const nowMs = this.clock.nowMs();
    const due = (await this.queue.pendingFor(owner)).filter(
      (record) =>
        options.ignoreBackoff === true ||
        record.nextAttemptAtMs === null ||
        record.nextAttemptAtMs <= nowMs,
    );
    for (let start = 0; start < due.length; start += OUTBOX_BATCH_SIZE) {
      await this.sendBatch(due.slice(start, start + OUTBOX_BATCH_SIZE));
    }
  }

  private async sendBatch(records: readonly OutboxRecord[]): Promise<void> {
    const ready: Ready[] = [];
    for (const record of records) {
      const payload = readSubmitReadingPayload(record.payload);
      if (payload === null) {
        await this.queue.settle(record.clientId, { type: 'REJECTED', code: LOCAL_CORRUPT_CODE });
      } else {
        ready.push({ record, payload });
      }
    }
    if (ready.length === 0) {
      return;
    }
    for (const item of ready) {
      await this.queue.markSending(item.record.clientId);
    }
    let answer: ReadingBatchResultView;
    try {
      answer = await this.submitBatch(ready);
    } catch (error) {
      const code = error instanceof DomainError ? error.code : null;
      await this.settleAll(ready, outcomeForWholeBatch(code));
      return;
    }
    const answers = new Map(answer.answers.map((item) => [item.id, item]));
    for (const item of ready) {
      await this.queue.settle(
        item.record.clientId,
        outcomeForAnswer(answers.get(item.record.clientId)),
      );
    }
  }

  /** A batch id the server already knows is refused: one new id and one more try (API.md 7.2). */
  private async submitBatch(ready: readonly Ready[]): Promise<ReadingBatchResultView> {
    const send = () =>
      this.submitter.submitBatch({
        syncBatchId: this.ids.nextId(),
        readings: ready.map((item) => toReadingInput(item)),
      });
    try {
      return await send();
    } catch (error) {
      if (isBatchIdReused(error)) {
        return send();
      }
      throw error;
    }
  }

  private async settleAll(ready: readonly Ready[], outcome: SubmitOutcome): Promise<void> {
    for (const item of ready) {
      await this.queue.settle(item.record.clientId, outcome);
    }
  }
}

function toReadingInput({ record, payload }: Ready): ReadingInput {
  return {
    id: record.clientId,
    tankId: payload.tankId,
    gaugeValue: payload.gaugeValue,
    waterAppearanceCode: payload.waterAppearanceCode,
    damageNoticed: payload.damageNoticed,
    note: payload.note,
    observedAt: new Date(payload.observedAt),
  };
}
