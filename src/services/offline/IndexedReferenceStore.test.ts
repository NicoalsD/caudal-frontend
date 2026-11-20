import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import { OfflineDatabase } from './OfflineDatabase';
import { IndexedReferenceStore } from './IndexedReferenceStore';

const FIRST_FETCH_MS = 10;
const SECOND_FETCH_MS = 20;
const openDatabases: OfflineDatabase[] = [];

function freshStore(): IndexedReferenceStore {
  const db = OfflineDatabase.create(`refs-${crypto.randomUUID()}`);
  openDatabases.push(db);
  return new IndexedReferenceStore(db);
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
});

describe('IndexedReferenceStore', () => {
  it('keeps each scope apart and returns the fetch time', async () => {
    const store = freshStore();
    await store.save('a-1', 'tanks', [{ id: 't-1' }], FIRST_FETCH_MS);
    await store.save('a-2', 'tanks', [{ id: 't-9' }], SECOND_FETCH_MS);

    expect(await store.load('a-1', 'tanks')).toEqual({
      payload: [{ id: 't-1' }],
      fetchedAtMs: FIRST_FETCH_MS,
    });
    expect(await store.load('a-2', 'tanks')).toEqual({
      payload: [{ id: 't-9' }],
      fetchedAtMs: SECOND_FETCH_MS,
    });
    expect(await store.load('a-1', 'rule-sets:current')).toBeNull();
  });

  it('forgets everything on clear', async () => {
    const store = freshStore();
    await store.save('global', 'constraints', {}, 1);
    await store.clear();

    expect(await store.load('global', 'constraints')).toBeNull();
  });
});
