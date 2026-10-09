import type { SessionState, SessionUser } from '../core/session/SessionState';

type Listener = () => void;

const ANONYMOUS: SessionState = { status: 'anonymous' };
const EXPIRED: SessionState = { status: 'expired' };

/**
 * In-memory observable session state (architecture.md 5.2).
 * It holds no tokens: the access token belongs to the future TokenStore.
 * Real sign-in arrives in phase 3; here it only exposes the state guards read.
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

  expire(): void {
    this.update(EXPIRED);
  }

  clear(): void {
    this.update(ANONYMOUS);
  }

  private update(next: SessionState): void {
    this.state = next;
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}
