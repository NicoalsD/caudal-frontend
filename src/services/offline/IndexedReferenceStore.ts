import type { CachedReference, ReferenceStore } from '../../core/cache/ReferenceStore';
import type { OfflineDatabase } from './OfflineDatabase';

/** The referenceCache table behind the reference port. The key is `<scope>|<name>`. */
export class IndexedReferenceStore implements ReferenceStore {
  constructor(private readonly db: OfflineDatabase) {}

  async load(scope: string, name: string): Promise<CachedReference | null> {
    const row = await this.db.referenceCache.get(keyOf(scope, name));
    return row === undefined ? null : { payload: row.payload, fetchedAtMs: row.fetchedAtMs };
  }

  async save(scope: string, name: string, payload: unknown, fetchedAtMs: number): Promise<void> {
    await this.db.referenceCache.put({
      key: keyOf(scope, name),
      aqueductId: scope,
      fetchedAtMs,
      payload,
    });
  }

  async clear(): Promise<void> {
    await this.db.referenceCache.clear();
  }
}

function keyOf(scope: string, name: string): string {
  return `${scope}|${name}`;
}
