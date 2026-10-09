import type { SessionState, SessionUser } from '../core/session/SessionState';

type Listener = () => void;

const ANONYMOUS: SessionState = { status: 'anonymous' };
const EXPIRED: SessionState = { status: 'expired' };
const RESTORING: SessionState = { status: 'restoring' };
const OFFLINE: SessionState = { status: 'anonymous', reason: 'offline' };

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

  /** Back to anonymous. `offline` tells the login screen the server could not be reached. */
  clear(reason?: 'offline'): void {
    this.update(reason === 'offline' ? OFFLINE : ANONYMOUS);
  }

  private update(next: SessionState): void {
    this.state = next;
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}
