import type { BackoffPolicy } from '../policy/Backoff';
import type { Clock } from '../time/Clock';
import type { Command } from './Command';
import type { OutboxOwner, OutboxRecord, OutboxStatus, RejectionDetails } from './OutboxRecord';
import type { OutboxRepository } from './OutboxRepository';

/** Statuses that still need the server: they are sent again on the next flush. */
const UNSENT_STATUSES: readonly OutboxStatus[] = ['PENDING', 'SENDING'];

/**
 * What the server answered for one item (offline-sync.md 4 and 5). `SAVED` covers ACCEPTED,
 * FLAGGED and REPLAYED: the reading is on the server, so it leaves the queue.
 */
export type SubmitOutcome =
  | { readonly type: 'SAVED' }
  | {
      readonly type: 'REJECTED';
      readonly code: string;
      readonly details?: RejectionDetails | undefined;
    }
  | { readonly type: 'RETRY'; readonly code: string }
  /** The server answered the batch but not this item: it goes back as it was, not an attempt. */
  | { readonly type: 'UNANSWERED' };

/** What happened to an item that left the queue during this session (never stored on the phone). */
export interface ClosedItem {
  readonly clientId: string;
  readonly owner: OutboxOwner;
  /** SENT: the server has it. DISCARDED: the person dropped it, with a reason. */
  readonly outcome: 'SENT' | 'DISCARDED';
  readonly payload: unknown;
  readonly reason: string | null;
  readonly closedAtMs: number;
}

/**
 * The offline queue (Command pattern, P13). It only stores and settles commands; sending them is
 * the job of the sync service. Enqueuing the same `clientId` twice keeps one record.
 */
export class CommandQueue {
  private readonly listeners = new Set<() => void>();
  private readonly closed: ClosedItem[] = [];

  constructor(
    private readonly repository: OutboxRepository,
    private readonly clock: Clock,
    private readonly backoff: BackoffPolicy,
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
    const record = this.newRecord(command, owner, ruleSetVersionId, null);
    await this.repository.put(record);
    this.notify();
    return record;
  }

  /** The stored item with this id, or null. */
  find(clientId: string): Promise<OutboxRecord | null> {
    return this.repository.get(clientId);
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

  /** Items of this owner sent or discarded during this session, oldest first. */
  closedFor(owner: OutboxOwner): ClosedItem[] {
    return this.closed.filter(
      (item) => item.owner.userId === owner.userId && item.owner.aqueductId === owner.aqueductId,
    );
  }

  async markSending(clientId: string): Promise<void> {
    await this.update(clientId, (record) => ({ ...record, status: 'SENDING' }));
  }

  /**
   * The person corrected a refused reading: the new value goes in as a new item with its own id
   * (offline-sync.md 7.4). The refused item had no copy on the server, so it leaves the queue.
   */
  async replace(
    replacedClientId: string,
    command: Command<unknown>,
    owner: OutboxOwner,
    ruleSetVersionId: string | null,
  ): Promise<OutboxRecord> {
    const record = this.newRecord(command, owner, ruleSetVersionId, replacedClientId);
    await this.repository.put(record);
    await this.repository.delete(replacedClientId);
    this.notify();
    return record;
  }

  /** The person drops a refused reading. The reason is kept for this session only. */
  async discard(clientId: string, reason: string): Promise<void> {
    const record = await this.repository.get(clientId);
    if (record === null) {
      return;
    }
    await this.repository.delete(clientId);
    this.closed.push({
      clientId,
      owner: { userId: record.userId, aqueductId: record.aqueductId },
      outcome: 'DISCARDED',
      payload: record.payload,
      reason,
      closedAtMs: this.clock.nowMs(),
    });
    this.notify();
  }

  /** Applies the server's answer. Nothing leaves the queue unless the server has the reading. */
  async settle(clientId: string, outcome: SubmitOutcome): Promise<void> {
    if (outcome.type === 'SAVED') {
      const record = await this.repository.get(clientId);
      await this.repository.delete(clientId);
      if (record !== null) {
        this.closed.push({
          clientId,
          owner: { userId: record.userId, aqueductId: record.aqueductId },
          outcome: 'SENT',
          payload: record.payload,
          reason: null,
          closedAtMs: this.clock.nowMs(),
        });
      }
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
        lastErrorDetails: outcome.details ?? null,
      }));
      return;
    }
    if (outcome.type === 'UNANSWERED') {
      await this.update(clientId, (record) => ({ ...record, status: 'PENDING' }));
      return;
    }
    await this.update(clientId, (record) => {
      const attempts = record.attempts + 1;
      return {
        ...record,
        status: 'PENDING',
        attempts,
        nextAttemptAtMs: nowMs + this.backoff.delayFor(attempts),
        lastErrorCode: outcome.code,
        lastErrorAtMs: nowMs,
      };
    });
  }

  private newRecord(
    command: Command<unknown>,
    owner: OutboxOwner,
    ruleSetVersionId: string | null,
    replacesClientId: string | null,
  ): OutboxRecord {
    return {
      clientId: command.clientId,
      kind: command.kind,
      status: 'PENDING',
      userId: owner.userId,
      aqueductId: owner.aqueductId,
      payload: command.payload,
      createdAt: new Date(this.clock.nowMs()).toISOString(),
      ruleSetVersionId,
      attempts: 0,
      nextAttemptAtMs: null,
      lastErrorCode: null,
      lastErrorAtMs: null,
      lastErrorDetails: null,
      replacesClientId,
    };
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
