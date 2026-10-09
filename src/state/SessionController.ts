import type { QueryClient } from '@tanstack/react-query';

import { NetworkError } from '../core/errors/NetworkError';
import { readAccessTokenClaims } from '../core/session/accessTokenClaims';
import type { SessionUser } from '../core/session/SessionState';
import { PROACTIVE_REFRESH_FRACTION } from '../core/policy/clientPolicy';
import type { Clock } from '../core/time/Clock';
import type { Scheduler } from '../core/time/Scheduler';
import type { CaudalApi } from '../services/api/CaudalApi';
import type { MeView } from '../services/api/views';
import type { ObservableSessionRefresher } from '../services/session/SessionRefreshProxy';
import type { TokenStore } from '../services/session/TokenStore';
import type { SessionStore } from './SessionStore';

const MS_PER_SECOND = 1000;

export interface SessionControllerDependencies {
  readonly api: CaudalApi;
  readonly tokens: TokenStore;
  readonly store: SessionStore;
  readonly refresher: ObservableSessionRefresher;
  readonly queryClient: QueryClient;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
}

function toSessionUser(
  me: MeView,
  identity: Pick<SessionUser, 'role' | 'aqueductId'>,
): SessionUser {
  return {
    userId: me.id,
    username: me.username,
    role: identity.role,
    aqueductId: identity.aqueductId,
    displayName: me.fullName,
    mustChangePassword: me.mustChangePassword,
    permissions: me.permissions,
  };
}

/**
 * Orchestrates the session life cycle: the token goes to the in-memory TokenStore and the
 * non-secret facts about the person go to the observable SessionStore.
 * Boot restore, the background renewal and the 401 retry all share one refresh (the proxy).
 */
export class SessionController {
  private restoring: Promise<void> | null = null;
  private cancelRenewal: (() => void) | null = null;

  constructor(private readonly deps: SessionControllerDependencies) {
    deps.refresher.subscribe({
      onRefreshed: (expiresAtMs) => {
        this.scheduleRenewal(expiresAtMs);
      },
      onSessionLost: () => {
        this.expire();
      },
    });
  }

  /** Signs in. Rejects with the API error (the form shows a generic text). */
  async signIn(credentials: {
    readonly username: string;
    readonly password: string;
  }): Promise<SessionUser> {
    const login = await this.deps.api.auth.login(credentials);
    const expiresAtMs = this.deps.clock.nowMs() + login.expiresInSeconds * MS_PER_SECOND;
    this.deps.tokens.set(login.accessToken, expiresAtMs);
    try {
      const me = await this.deps.api.auth.me();
      const user = toSessionUser(me, login.user);
      this.deps.store.signIn(user);
      this.scheduleRenewal(expiresAtMs);
      return user;
    } catch (error) {
      this.deps.tokens.clear();
      throw error;
    }
  }

  /**
   * Boot: asks the server for a new access token with the refresh cookie. Call it once from the
   * composition root, never from an effect: StrictMode would send two refreshes with the same
   * cookie and the server would revoke the whole family.
   */
  restore(): Promise<void> {
    this.restoring ??= this.runRestore();
    return this.restoring;
  }

  /** Signs out. The local session closes even when the server cannot be reached. */
  async logout(): Promise<void> {
    try {
      await this.deps.api.auth.logout();
    } catch {
      // The refresh cookie will expire on the server; the local session closes anyway.
    } finally {
      this.cleanUp();
      this.deps.store.clear();
    }
  }

  /** The session ended on the server side (refresh refused): show the login with a notice. */
  private expire(): void {
    this.cleanUp();
    this.deps.store.expire();
  }

  private cleanUp(): void {
    this.cancelRenewal?.();
    this.cancelRenewal = null;
    this.deps.tokens.clear();
    this.deps.queryClient.clear();
  }

  private async runRestore(): Promise<void> {
    this.deps.store.beginRestore();
    try {
      await this.deps.refresher.refresh();
      const claims = readAccessTokenClaims(this.deps.tokens.get() ?? '');
      if (claims === null) {
        throw new Error('The access token has no readable claims');
      }
      const me = await this.deps.api.auth.me();
      this.deps.store.signIn(toSessionUser(me, claims));
    } catch (error) {
      this.cleanUp();
      this.deps.store.clear(error instanceof NetworkError ? 'offline' : undefined);
    }
  }

  private scheduleRenewal(expiresAtMs: number): void {
    this.cancelRenewal?.();
    const remaining = expiresAtMs - this.deps.clock.nowMs();
    this.cancelRenewal = this.deps.scheduler.after(remaining * PROACTIVE_REFRESH_FRACTION, () => {
      this.deps.refresher.refresh().catch(() => undefined);
    });
  }
}
