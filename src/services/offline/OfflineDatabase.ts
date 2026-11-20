import Dexie, { type Table } from 'dexie';

import type { OutboxRecord } from '../../core/commands/OutboxRecord';
import type { SessionHint } from '../../core/session/SessionHint';
import { OFFLINE_SCHEMA_VERSION, offlineStores } from './schema';
import type { ReferenceRecord } from './schema';

export const OFFLINE_DB_NAME = 'caudal-offline';

/**
 * The phone's IndexedDB. One connection per page (Singleton, P01): two Dexie instances on the same
 * name fight over the schema version. `create` is only for tests, with an isolated name.
 */
export class OfflineDatabase extends Dexie {
  private static instance: OfflineDatabase | undefined;

  readonly outbox!: Table<OutboxRecord, string>;
  readonly referenceCache!: Table<ReferenceRecord, string>;
  readonly sessionHints!: Table<SessionHint, string>;

  private constructor(name: string) {
    super(name);
    this.version(OFFLINE_SCHEMA_VERSION).stores(offlineStores);
  }

  /** Shared connection. Named `shared` because Dexie already defines a static `default`. */
  static get shared(): OfflineDatabase {
    OfflineDatabase.instance ??= new OfflineDatabase(OFFLINE_DB_NAME);
    return OfflineDatabase.instance;
  }

  /** Test factory: a new, isolated database. The app never calls it. */
  static create(name: string): OfflineDatabase {
    return new OfflineDatabase(name);
  }

  /** Closes the shared connection; the next `default` call opens a new one. */
  static resetDefault(): void {
    OfflineDatabase.instance?.close();
    OfflineDatabase.instance = undefined;
  }
}
