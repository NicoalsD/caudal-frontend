import type { CommandQueue } from '../core/commands/CommandQueue';
import { classifyFailure, LOCAL_CORRUPT_CODE } from '../core/commands/classifyFailure';
import type { OutboxOwner, OutboxRecord } from '../core/commands/OutboxRecord';
import { readSubmitReadingPayload } from '../core/commands/SubmitReadingCommand';
import type { ReadingInput } from '../services/api/views';

/** What the sync needs from the API to send one reading (the facade's readings endpoint). */
export interface ReadingSubmitter {
  submit(input: ReadingInput): Promise<unknown>;
}

/**
 * Sends the owner's queued readings and settles each one with the server's answer. One flush runs
 * at a time: a second call while one is running shares it.
 */
export class OutboxSync {
  private inFlight: Promise<void> | null = null;

  constructor(
    private readonly queue: CommandQueue,
    private readonly submitter: ReadingSubmitter,
  ) {}

  flush(owner: OutboxOwner): Promise<void> {
    this.inFlight ??= this.sendAll(owner).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async sendAll(owner: OutboxOwner): Promise<void> {
    for (const record of await this.queue.pendingFor(owner)) {
      await this.sendOne(record);
    }
  }

  private async sendOne(record: OutboxRecord): Promise<void> {
    const payload = readSubmitReadingPayload(record.payload);
    if (payload === null) {
      await this.queue.settle(record.clientId, { type: 'REJECTED', code: LOCAL_CORRUPT_CODE });
      return;
    }
    await this.queue.markSending(record.clientId);
    try {
      await this.submitter.submit({
        id: record.clientId,
        tankId: payload.tankId,
        gaugeValue: payload.gaugeValue,
        waterAppearanceCode: payload.waterAppearanceCode,
        damageNoticed: payload.damageNoticed,
        note: payload.note,
        observedAt: new Date(payload.observedAt),
      });
      await this.queue.settle(record.clientId, { type: 'SAVED' });
    } catch (error) {
      await this.queue.settle(record.clientId, classifyFailure(error));
    }
  }
}
