import type { SessionState, SessionUser } from '../core/session/SessionState';

type Listener = () => void;

const ANONYMOUS: SessionState = { status: 'anonymous' };
const EXPIRED: SessionState = { status: 'expired' };
const RESTORING: SessionState = { status: 'restoring' };
const OFFLINE: SessionState = { status: 'anonymous', reason: 'offline' };
const PASSWORD_CHANGED: SessionState = { status: 'anonymous', reason: 'password-changed' };

/**
 * In-memory observable session state (architecture.md 5.2).
 * It holds no tokens: the access token belongs to the TokenStore (services/session).
 */
export class SessionStore {
  private state: SessionState = ANONYMOUS;
  private readonly listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): SessionState => this.state;

  signIn(user: SessionUser): void {
    this.update({ status: 'authenticated', user });
  }

  /** Boot: the refresh cookie is being checked, so guards must wait instead of redirecting. */
  beginRestore(): void {
    this.update(RESTORING);
  }

  /** The server answered PASSWORD_CHANGE_REQUIRED: from now on only the change screen is open. */
  requirePasswordChange(): void {
    if (this.state.status === 'authenticated' && !this.state.user.mustChangePassword) {
      this.signIn({ ...this.state.user, mustChangePassword: true });
    }
  }

  expire(): void {
    this.update(EXPIRED);
  }

  /**
   * Back to anonymous. The reason tells the login screen what to say: `offline` (the server could
   * not be reached) or `password-changed` (the change ended the session, as the server requires).
   */
  clear(reason?: 'offline' | 'password-changed'): void {
    if (reason === 'offline') {
      this.update(OFFLINE);
    } else {
      this.update(reason === 'password-changed' ? PASSWORD_CHANGED : ANONYMOUS);
    }
  }

  private update(next: SessionState): void {
    this.state = next;
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}
