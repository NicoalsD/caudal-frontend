import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import type { OutboxRecord } from '../../core/commands/OutboxRecord';
import { OfflineDatabase } from './OfflineDatabase';
import { IndexedOutboxRepository } from './IndexedOutboxRepository';

const openDatabases: OfflineDatabase[] = [];

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
});

function record(clientId: string, userId: string, createdAt: string): OutboxRecord {
  return {
    clientId,
    kind: 'SUBMIT_READING',
    status: 'PENDING',
    userId,
    aqueductId: 'a-1',
    payload: { gaugeValue: 2.1 },
    createdAt,
    ruleSetVersionId: null,
    attempts: 0,
    nextAttemptAtMs: null,
    lastErrorCode: null,
    lastErrorAtMs: null,
  };
}

describe('IndexedOutboxRepository', () => {
  it('stores, reads and deletes records', async () => {
    const db = OfflineDatabase.create(`outbox-${crypto.randomUUID()}`);
    openDatabases.push(db);
    const repository = new IndexedOutboxRepository(db);
    const item = record('c-1', 'u-1', '2026-10-14T08:00:00.000Z');

    await repository.put(item);
    expect(await repository.get('c-1')).toEqual(item);
    await repository.delete('c-1');
    expect(await repository.get('c-1')).toBeNull();
  });

  it('lists only the owner items with the asked statuses, oldest first', async () => {
    const db = OfflineDatabase.create(`outbox-${crypto.randomUUID()}`);
    openDatabases.push(db);
    const repository = new IndexedOutboxRepository(db);
    await repository.put(record('late', 'u-1', '2026-10-14T09:00:00.000Z'));
    await repository.put(record('early', 'u-1', '2026-10-14T08:00:00.000Z'));
    await repository.put(record('other', 'u-2', '2026-10-14T07:00:00.000Z'));

    const owned = await repository.list({ userId: 'u-1', aqueductId: 'a-1' }, ['PENDING']);
    expect(owned.map((item) => item.clientId)).toEqual(['early', 'late']);
    expect(await repository.list({ userId: 'u-1', aqueductId: 'a-2' }, ['PENDING'])).toEqual([]);
  });
});
