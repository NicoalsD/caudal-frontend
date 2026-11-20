import type { OutboxOwner, OutboxRecord, OutboxStatus } from './OutboxRecord';

/** Port: where the queue keeps its records. The IndexedDB adapter lives in services/offline. */
export interface OutboxRepository {
  get(clientId: string): Promise<OutboxRecord | null>;
  put(record: OutboxRecord): Promise<void>;
  delete(clientId: string): Promise<void>;
  /** Records of one owner with one of the statuses, oldest first. */
  list(owner: OutboxOwner, statuses: readonly OutboxStatus[]): Promise<OutboxRecord[]>;
}
