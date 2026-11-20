import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import { OfflineDatabase } from './OfflineDatabase';

const openDatabases: OfflineDatabase[] = [];

function uniqueDatabase(): OfflineDatabase {
  const db = OfflineDatabase.create(`test-${crypto.randomUUID()}`);
  openDatabases.push(db);
  return db;
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
  OfflineDatabase.resetDefault();
});

describe('OfflineDatabase', () => {
  it('keeps the same connection for the default instance', () => {
    expect(OfflineDatabase.shared).toBe(OfflineDatabase.shared);
  });

  it('opens a new connection after resetDefault', () => {
    const first = OfflineDatabase.shared;
    OfflineDatabase.resetDefault();
    expect(OfflineDatabase.shared).not.toBe(first);
  });

  it('gives each created database its own data', async () => {
    const db = uniqueDatabase();
    const other = uniqueDatabase();
    await db.sessionHints.put({
      userId: 'u1',
      role: 'OPERATOR',
      aqueductId: 'a1',
      displayName: 'Ana',
      expiresAtMs: 1,
    });
    expect(await other.sessionHints.count()).toBe(0);
    expect(await db.sessionHints.count()).toBe(1);
  });

  it('round-trips a reference record unchanged', async () => {
    const db = uniqueDatabase();
    const record = {
      key: 'a1|rule-sets:current',
      aqueductId: 'a1',
      fetchedAtMs: 10,
      payload: { version: 'v7' },
    };
    await db.referenceCache.put(record);
    expect(await db.referenceCache.get(record.key)).toEqual(record);
  });
});
