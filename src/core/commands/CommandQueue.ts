import type { Clock } from '../time/Clock';
import type { Command } from './Command';
import type { OutboxOwner, OutboxRecord, OutboxStatus } from './OutboxRecord';
import type { OutboxRepository } from './OutboxRepository';

/** Statuses that still need the server: they are sent again on the next flush. */
const UNSENT_STATUSES: readonly OutboxStatus[] = ['PENDING', 'SENDING'];

/**
 * What the server answered for one item (offline-sync.md 4 and 5). `SAVED` covers ACCEPTED,
 * FLAGGED and REPLAYED: the reading is on the server, so it leaves the queue.
 */
export type SubmitOutcome =
  | { readonly type: 'SAVED' }
  | { readonly type: 'REJECTED'; readonly code: string }
  | { readonly type: 'RETRY'; readonly code: string };

/**
 * The offline queue (Command pattern, P13). It only stores and settles commands; sending them is
 * the job of the sync service. Enqueuing the same `clientId` twice keeps one record.
 */
export class CommandQueue {
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly repository: OutboxRepository,
    private readonly clock: Clock,
  ) {}

  /** Observer: `listener` runs after every change of the queue. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async enqueue(
    command: Command<unknown>,
    owner: OutboxOwner,
    ruleSetVersionId: string | null,
  ): Promise<OutboxRecord> {
    const existing = await this.repository.get(command.clientId);
    if (existing !== null) {
      return existing;
    }
    const nowMs = this.clock.nowMs();
    const record: OutboxRecord = {
      clientId: command.clientId,
      kind: command.kind,
      status: 'PENDING',
      userId: owner.userId,
      aqueductId: owner.aqueductId,
      payload: command.payload,
      createdAt: new Date(nowMs).toISOString(),
      ruleSetVersionId,
      attempts: 0,
      nextAttemptAtMs: null,
      lastErrorCode: null,
      lastErrorAtMs: null,
    };
    await this.repository.put(record);
    this.notify();
    return record;
  }

  /** Items of this owner that still need to reach the server, oldest first. */
  pendingFor(owner: OutboxOwner): Promise<OutboxRecord[]> {
    return this.repository.list(owner, UNSENT_STATUSES);
  }

  /** Items of this owner that are waiting, to show a count. */
  async countPendingFor(owner: OutboxOwner): Promise<number> {
    return (await this.pendingFor(owner)).length;
  }

  /** Items of this owner that the server refused and the person must correct. */
  correctionsFor(owner: OutboxOwner): Promise<OutboxRecord[]> {
    return this.repository.list(owner, ['CORRECTION_PENDING']);
  }

  async markSending(clientId: string): Promise<void> {
    await this.update(clientId, (record) => ({ ...record, status: 'SENDING' }));
  }

  /** Applies the server's answer. Nothing leaves the queue unless the server has the reading. */
  async settle(clientId: string, outcome: SubmitOutcome): Promise<void> {
    if (outcome.type === 'SAVED') {
      await this.repository.delete(clientId);
      this.notify();
      return;
    }
    const nowMs = this.clock.nowMs();
    if (outcome.type === 'REJECTED') {
      await this.update(clientId, (record) => ({
        ...record,
        status: 'CORRECTION_PENDING',
        lastErrorCode: outcome.code,
        lastErrorAtMs: nowMs,
      }));
      return;
    }
    await this.update(clientId, (record) => ({
      ...record,
      status: 'PENDING',
      attempts: record.attempts + 1,
      lastErrorCode: outcome.code,
      lastErrorAtMs: nowMs,
    }));
  }

  private async update(
    clientId: string,
    change: (record: OutboxRecord) => OutboxRecord,
  ): Promise<void> {
    const record = await this.repository.get(clientId);
    if (record !== null) {
      await this.repository.put(change(record));
      this.notify();
    }
  }

  private notify(): void {
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}
