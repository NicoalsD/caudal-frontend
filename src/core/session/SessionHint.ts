import type { Role } from './roles';
import type { SessionUser } from './SessionState';

/**
 * What the app remembers about a session so the fontanero can open the local screens without
 * connection (architecture.md 5.5). It has no token, cookie, password or key: only facts that are
 * already shown on screen. One hint per aqueduct, so sessions never mix.
 */
export interface SessionHint {
  readonly userId: string;
  readonly role: Role;
  readonly aqueductId: string;
  readonly displayName: string;
  /** Epoch milliseconds after which the hint no longer opens the local mode. */
  readonly expiresAtMs: number;
}

/** Where hints are kept. In memory today; the IndexedDB implementation arrives with OfflineDatabase. */
export interface SessionHintRepository {
  get(aqueductId: string): SessionHint | null;
  put(hint: SessionHint): void;
  remove(aqueductId: string): void;
  /** Sign out: no hint survives. */
  clear(): void;
}

export class InMemorySessionHintRepository implements SessionHintRepository {
  private readonly hints = new Map<string, SessionHint>();

  get(aqueductId: string): SessionHint | null {
    return this.hints.get(aqueductId) ?? null;
  }

  put(hint: SessionHint): void {
    this.hints.set(hint.aqueductId, hint);
  }

  remove(aqueductId: string): void {
    this.hints.delete(aqueductId);
  }

  clear(): void {
    this.hints.clear();
  }
}

export function toSessionHint(user: SessionUser, nowMs: number, ttlMs: number): SessionHint {
  return {
    userId: user.userId,
    role: user.role,
    aqueductId: user.aqueductId,
    displayName: user.displayName,
    expiresAtMs: nowMs + ttlMs,
  };
}

/**
 * True when the hint may open the local mode for `aqueductId`: it belongs to that aqueduct, it has
 * not expired and the role is the one that works without connection.
 */
export function opensLocalMode(
  hint: SessionHint | null,
  aqueductId: string,
  localRole: Role,
  nowMs: number,
): boolean {
  return (
    hint !== null &&
    hint.aqueductId === aqueductId &&
    hint.role === localRole &&
    nowMs < hint.expiresAtMs
  );
}
