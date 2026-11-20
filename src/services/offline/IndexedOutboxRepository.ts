import type { OutboxRepository } from '../../core/commands/OutboxRepository';
import type { OutboxOwner, OutboxRecord, OutboxStatus } from '../../core/commands/OutboxRecord';
import type { OfflineDatabase } from './OfflineDatabase';

/** The outbox table of OfflineDatabase behind the queue's port. */
export class IndexedOutboxRepository implements OutboxRepository {
  constructor(private readonly db: OfflineDatabase) {}

  async get(clientId: string): Promise<OutboxRecord | null> {
    return (await this.db.outbox.get(clientId)) ?? null;
  }

  async put(record: OutboxRecord): Promise<void> {
    await this.db.outbox.put(record);
  }

  async delete(clientId: string): Promise<void> {
    await this.db.outbox.delete(clientId);
  }

  async list(owner: OutboxOwner, statuses: readonly OutboxStatus[]): Promise<OutboxRecord[]> {
    return this.db.outbox
      .where('userId')
      .equals(owner.userId)
      .filter(
        (record) => record.aqueductId === owner.aqueductId && statuses.includes(record.status),
      )
      .sortBy('createdAt');
  }
}
