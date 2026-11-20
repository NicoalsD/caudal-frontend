/**
 * Dexie schema of the offline database (offline-sync.md section 2). Keys and index names are
 * English; the data never includes tokens, cookies, passwords or keys.
 */
export const OFFLINE_SCHEMA_VERSION = 1;

export const offlineStores = {
  outbox: 'clientId, status, kind, userId, aqueductId, nextAttemptAtMs',
  referenceCache: 'key, aqueductId',
  sessionHints: 'aqueductId',
} as const;

/** One cached reference document (constraints, rule set, catalog, tanks) of one aqueduct. */
export interface ReferenceRecord {
  /** `<aqueductId>|<name>`, for example `<id>|rule-sets:current`. */
  readonly key: string;
  readonly aqueductId: string;
  /** Epoch milliseconds when the document was fetched from the API. */
  readonly fetchedAtMs: number;
  readonly payload: unknown;
}
