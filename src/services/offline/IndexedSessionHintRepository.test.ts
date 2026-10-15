import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SessionHint } from '../../core/session/SessionHint';
import { OfflineDatabase } from './OfflineDatabase';
import { IndexedSessionHintRepository } from './IndexedSessionHintRepository';

const HINT: SessionHint = {
  userId: 'u-1',
  role: 'OPERATOR',
  aqueductId: 'a-1',
  displayName: 'Persona Uno',
  expiresAtMs: 5_000,
};

const openDatabases: OfflineDatabase[] = [];

function freshDatabase(): OfflineDatabase {
  const db = OfflineDatabase.create(`hints-${crypto.randomUUID()}`);
  openDatabases.push(db);
  return db;
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) {
    db.close();
  }
});

describe('IndexedSessionHintRepository', () => {
  it('returns a hint after a reload from IndexedDB', async () => {
    const db = freshDatabase();
    new IndexedSessionHintRepository(db).put(HINT);

    const reloaded = new IndexedSessionHintRepository(db);
    await reloaded.load();

    expect(reloaded.get('a-1')).toEqual(HINT);
  });

  it('removes one aqueduct and clears all of them', async () => {
    const db = freshDatabase();
    const repository = new IndexedSessionHintRepository(db);
    repository.put(HINT);
    repository.put({ ...HINT, aqueductId: 'a-2' });

    repository.remove('a-1');
    expect(repository.get('a-1')).toBeNull();
    expect(repository.get('a-2')).not.toBeNull();

    repository.clear();
    expect(repository.get('a-2')).toBeNull();
    await vi.waitFor(async () => {
      expect(await db.sessionHints.count()).toBe(0);
    });
  });

  it('never stores a token or cookie smuggled in through a cast', async () => {
    const db = freshDatabase();
    const smuggled = { ...HINT, accessToken: 'eyJhbGciOi.secret', refreshCookie: 'caudal_rt=x' };
    new IndexedSessionHintRepository(db).put(smuggled);

    await vi.waitFor(async () => {
      expect(await db.sessionHints.count()).toBe(1);
    });
    const [row] = await db.sessionHints.toArray();
    expect(Object.keys(row ?? {}).sort()).toEqual(
      ['aqueductId', 'displayName', 'expiresAtMs', 'role', 'userId'].sort(),
    );
    expect(JSON.stringify(row)).not.toContain('eyJhbGciOi');
  });

  it('reports a failed write without throwing into the caller', async () => {
    const db = freshDatabase();
    const errors: unknown[] = [];
    db.close();
    const repository = new IndexedSessionHintRepository(db, (error) => errors.push(error));

    expect(() => {
      repository.put(HINT);
    }).not.toThrow();
    expect(repository.get('a-1')).toEqual(HINT);
    await vi.waitFor(() => {
      expect(errors).toHaveLength(1);
    });
  });
});
