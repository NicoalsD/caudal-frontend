import type { OutboxRepository } from './OutboxRepository';
import type { OutboxOwner, OutboxRecord, OutboxStatus } from './OutboxRecord';

/** Test double of the outbox port. Records are copied so callers cannot mutate the stored state. */
export class InMemoryOutboxRepository implements OutboxRepository {
  private readonly records = new Map<string, OutboxRecord>();

  get(clientId: string): Promise<OutboxRecord | null> {
    const record = this.records.get(clientId);
    return Promise.resolve(record === undefined ? null : { ...record });
  }

  put(record: OutboxRecord): Promise<void> {
    this.records.set(record.clientId, { ...record });
    return Promise.resolve();
  }

  delete(clientId: string): Promise<void> {
    this.records.delete(clientId);
    return Promise.resolve();
  }

  list(owner: OutboxOwner, statuses: readonly OutboxStatus[]): Promise<OutboxRecord[]> {
    const items = [...this.records.values()]
      .filter(
        (record) =>
          record.userId === owner.userId &&
          record.aqueductId === owner.aqueductId &&
          statuses.includes(record.status),
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((record) => ({ ...record }));
    return Promise.resolve(items);
  }
}
