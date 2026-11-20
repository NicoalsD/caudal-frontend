import type { SessionHint, SessionHintRepository } from '../../core/session/SessionHint';
import type { OfflineDatabase } from './OfflineDatabase';

/**
 * Session hints in IndexedDB (offline-sync.md section 10). The interface is synchronous, so reads
 * come from an in-memory mirror that `load()` fills once at boot; every write goes to the mirror
 * first and then to IndexedDB. Each hint is rebuilt field by field before it is kept or stored:
 * anything else an object carries (a token, a cookie) never reaches the disk.
 */
export class IndexedSessionHintRepository implements SessionHintRepository {
  private readonly mirror = new Map<string, SessionHint>();
  /** Counts the writes: a load that finishes after one of them must not overwrite it. */
  private writes = 0;

  constructor(
    private readonly db: OfflineDatabase,
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {}

  /** Reads the stored hints into the mirror. Call once at boot, before the session restores. */
  async load(): Promise<void> {
    const writesBefore = this.writes;
    const rows = await this.db.sessionHints.toArray();
    if (this.writes !== writesBefore) {
      return;
    }
    this.mirror.clear();
    for (const row of rows) {
      const hint = toStoredHint(row);
      this.mirror.set(hint.aqueductId, hint);
    }
  }

  get(aqueductId: string): SessionHint | null {
    return this.mirror.get(aqueductId) ?? null;
  }

  put(hint: SessionHint): void {
    this.writes += 1;
    const stored = toStoredHint(hint);
    this.mirror.set(stored.aqueductId, stored);
    this.persist(() => this.db.sessionHints.put(stored));
  }

  remove(aqueductId: string): void {
    this.writes += 1;
    this.mirror.delete(aqueductId);
    this.persist(() => this.db.sessionHints.delete(aqueductId));
  }

  clear(): void {
    this.writes += 1;
    this.mirror.clear();
    this.persist(() => this.db.sessionHints.clear());
  }

  private persist(write: () => PromiseLike<unknown>): void {
    Promise.resolve(write()).catch((error: unknown) => {
      this.onError(error);
    });
  }
}

/** Copies only the five fields of a hint. Nothing else is read, so nothing else is stored. */
function toStoredHint(source: SessionHint): SessionHint {
  return {
    userId: source.userId,
    role: source.role,
    aqueductId: source.aqueductId,
    displayName: source.displayName,
    expiresAtMs: source.expiresAtMs,
  };
}
