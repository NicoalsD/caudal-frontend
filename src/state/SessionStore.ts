import { AnonymousPhase } from '../core/session/SessionPhase';
import type { SessionEvent, SessionPhase } from '../core/session/SessionPhase';
import type { SessionState, SessionUser } from '../core/session/SessionState';

type Listener = () => void;

/** Called when the current state ignores an event, so the gap is noticed in development. */
export type IgnoredEventHandler = (
  event: SessionEvent['type'],
  phase: SessionPhase['name'],
) => void;

/**
 * In-memory observable session (architecture.md 5.2). It holds the current state object of the
 * State pattern (core/session/SessionPhase) and tells subscribers when it changes.
 * It holds no tokens: the access token belongs to the TokenStore (services/session).
 */
export class SessionStore {
  private phase: SessionPhase = new AnonymousPhase();
  private readonly listeners = new Set<Listener>();

  constructor(private readonly onIgnored: IgnoredEventHandler = () => undefined) {}

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** The same object until the state changes, as useSyncExternalStore requires. */
  readonly getSnapshot = (): SessionState => this.phase.snapshot;

  signIn(user: SessionUser): void {
    this.dispatch({ type: 'SIGNED_IN', user });
  }

  /** Boot: the refresh cookie is being checked, so guards must wait instead of redirecting. */
  beginRestore(): void {
    this.dispatch({ type: 'RESTORE_STARTED' });
  }

  /** The server answered PASSWORD_CHANGE_REQUIRED: from now on only the change screen is open. */
  requirePasswordChange(): void {
    this.dispatch({ type: 'PASSWORD_CHANGE_REQUIRED' });
  }

  expire(): void {
    this.dispatch({ type: 'EXPIRED' });
  }

  /**
   * Leaves the session. The reason tells the login screen what to say: `offline` (the restore could
   * not reach the server) or `password-changed` (the change ended the session, as the server
   * requires). Without a reason it is a plain sign out.
   */
  clear(reason?: 'offline' | 'password-changed'): void {
    if (reason === 'offline') {
      this.dispatch({ type: 'RESTORE_FAILED', offline: true });
    } else if (reason === 'password-changed') {
      this.dispatch({ type: 'PASSWORD_CHANGED' });
    } else if (this.phase.name === 'RESTORING') {
      this.dispatch({ type: 'RESTORE_FAILED', offline: false });
    } else {
      this.dispatch({ type: 'SIGNED_OUT' });
    }
  }

  private dispatch(event: SessionEvent): void {
    const next = this.phase.next(event);
    if (next === this.phase) {
      this.onIgnored(event.type, this.phase.name);
      return;
    }
    this.phase = next;
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}
