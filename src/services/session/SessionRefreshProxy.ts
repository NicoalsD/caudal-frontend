import { httpStatusOf } from '../../core/errors/httpInfo';
import type { Clock } from '../../core/time/Clock';
import type { RefreshView } from '../api/views';
import type { SessionRefresher } from './SessionRefresher';
import type { TokenStore } from './TokenStore';

const MS_PER_SECOND = 1000;
const UNAUTHORIZED_STATUS = 401;
const FORBIDDEN_STATUS = 403;

export interface SessionRefreshListener {
  /** A new access token is in memory; it stops being valid at `expiresAtMs`. */
  onRefreshed(expiresAtMs: number): void;
  /** The server refused the renewal while a session existed: the person must sign in again. */
  onSessionLost(): void;
}

/** A SessionRefresher that tells interested parties what happened to the session. */
export interface ObservableSessionRefresher extends SessionRefresher {
  subscribe(listener: SessionRefreshListener): () => void;
}

/**
 * Stand-in (P11 Proxy) for the remote POST /auth/refresh. Every caller (boot restore, the timer
 * and the 401 retry of AuthHttpClient) goes through it, which gives the remote call three things
 * it lacks: one refresh in flight at a time (the server revokes the whole token family if a
 * rotated cookie comes back twice), the new token stored in memory, and a notification when the
 * session is lost.
 *
 * Only a 401 or 403 answer ends the session. A network failure leaves it as it is: the operator
 * works offline and the token may still be useful later.
 *
 * @pattern P11 Proxy
 */
export class SessionRefreshProxy implements ObservableSessionRefresher {
  private inFlight: Promise<void> | null = null;
  private readonly listeners = new Set<SessionRefreshListener>();

  constructor(
    private readonly remote: () => Promise<RefreshView>,
    private readonly tokens: TokenStore,
    private readonly clock: Clock,
  ) {}

  subscribe(listener: SessionRefreshListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  refresh(): Promise<void> {
    this.inFlight ??= this.run().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async run(): Promise<void> {
    const hadSession = this.tokens.get() !== null;
    try {
      const renewed = await this.remote();
      const expiresAtMs = this.clock.nowMs() + renewed.expiresInSeconds * MS_PER_SECOND;
      this.tokens.set(renewed.accessToken, expiresAtMs);
      this.listeners.forEach((listener) => {
        listener.onRefreshed(expiresAtMs);
      });
    } catch (error) {
      const status = httpStatusOf(error);
      if (status === UNAUTHORIZED_STATUS || status === FORBIDDEN_STATUS) {
        this.tokens.clear();
        if (hadSession) {
          this.listeners.forEach((listener) => {
            listener.onSessionLost();
          });
        }
      }
      throw error;
    }
  }
}
