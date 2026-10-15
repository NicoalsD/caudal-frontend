import type { QueryClient } from '@tanstack/react-query';

import { DomainError } from '../core/errors/DomainError';
import { NetworkError } from '../core/errors/NetworkError';
import { currentMembershipChoices } from '../core/session/memberships';
import { toSessionHint } from '../core/session/SessionHint';
import type { SessionHintRepository } from '../core/session/SessionHint';
import type { ReferenceStore } from '../core/cache/ReferenceStore';
import { readAccessTokenClaims } from '../core/session/accessTokenClaims';
import type { SessionUser } from '../core/session/SessionState';
import { OPERATOR_SESSION_HINT_MS, PROACTIVE_REFRESH_FRACTION } from '../core/policy/clientPolicy';
import type { Clock } from '../core/time/Clock';
import type { Scheduler } from '../core/time/Scheduler';
import type { CaudalApi } from '../services/api/CaudalApi';
import type { MeView } from '../services/api/views';
import type { ObservableSessionRefresher } from '../services/session/SessionRefreshProxy';
import type { TokenStore } from '../services/session/TokenStore';
import type { SessionStore } from './SessionStore';

const MS_PER_SECOND = 1000;
/** The only role that keeps working screens without connection (architecture.md 5.5). */
const LOCAL_MODE_ROLE = 'OPERATOR';
const PASSWORD_CHANGE_REQUIRED_CODE = 'PASSWORD_CHANGE_REQUIRED';
const PRIVACY_NOTICE_PENDING_CODE = 'PRIVACY_NOTICE_PENDING';

export interface SessionControllerDependencies {
  readonly api: CaudalApi;
  readonly tokens: TokenStore;
  readonly store: SessionStore;
  readonly refresher: ObservableSessionRefresher;
  readonly queryClient: QueryClient;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly hints: SessionHintRepository;
  /** Reference copies kept for offline use: cleared on sign out. The reading queue is not. */
  readonly references?: ReferenceStore;
}

function toSessionUser(
  me: MeView,
  identity: Pick<SessionUser, 'role' | 'aqueductId'>,
  nowMs: number,
): SessionUser {
  return {
    userId: me.id,
    username: me.username,
    role: identity.role,
    aqueductId: identity.aqueductId,
    displayName: me.fullName,
    mustChangePassword: me.mustChangePassword,
    permissions: me.permissions,
    memberships: currentMembershipChoices(me.memberships, nowMs),
  };
}

/**
 * Orchestrates the session life cycle: the token goes to the in-memory TokenStore and the
 * non-secret facts about the person go to the observable SessionStore.
 * Boot restore, the background renewal and the 401 retry all share one refresh (the proxy).
 */
export class SessionController {
  private restoring: Promise<void> | null = null;
  private cacheIdentity: string | null = null;
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
      const user = toSessionUser(me, login.user, this.deps.clock.nowMs());
      this.admit(user);
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

  /**
   * Changes the password. The server revokes every refresh token (API.md 2.5), so on success the
   * local session closes too and the person signs in again with the new password.
   */
  async changePassword(input: {
    readonly currentPassword: string;
    readonly newPassword: string;
  }): Promise<void> {
    await this.deps.api.auth.changePassword(input);
    this.cleanUp();
    this.deps.store.clear('password-changed');
  }

  /** Signs out. The local session closes even when the server cannot be reached. */
  async logout(): Promise<void> {
    try {
      await this.deps.api.auth.logout();
    } catch {
      // The refresh cookie will expire on the server; the local session closes anyway.
    } finally {
      this.cleanUp();
      await this.clearReferences();
      this.deps.store.clear();
    }
  }

  /**
   * Looks at every failed query or mutation. PASSWORD_CHANGE_REQUIRED (403) means the account
   * must change its password first, whatever screen noticed it (API.md section 1.4).
   */
  handleError(error: unknown): void {
    if (!(error instanceof DomainError)) {
      return;
    }
    if (error.code === PASSWORD_CHANGE_REQUIRED_CODE) {
      this.deps.store.requirePasswordChange();
    } else if (error.code === PRIVACY_NOTICE_PENDING_CODE) {
      this.deps.store.requirePrivacyNotice();
    }
  }

  /**
   * Accepts the notice version on the server. Only a successful answer opens the app: a failed or
   * offline acceptance keeps the person on the notice screen. Every cached query is read again,
   * because the ones that failed with PRIVACY_NOTICE_PENDING hold that error.
   */
  async acceptPrivacyNotice(version: number): Promise<void> {
    await this.deps.api.privacy.accept(version);
    this.deps.store.acceptPrivacyNotice();
    await this.deps.queryClient.invalidateQueries();
  }

  /** The session ended on the server side (refresh refused): show the login with a notice. */
  private expire(): void {
    this.cleanUp();
    this.deps.store.expire();
  }

  /**
   * Changes the aqueduct the session works in. The old aqueduct's data must not stay in memory:
   * running requests are cancelled and the cache is emptied before the new identity is published.
   * If the server refuses (403), nothing changes.
   */
  async switchAqueduct(aqueductId: string): Promise<SessionUser> {
    const switched = await this.deps.api.auth.switchAqueduct(aqueductId);
    const expiresAtMs = this.deps.clock.nowMs() + switched.expiresInSeconds * MS_PER_SECOND;
    await this.deps.queryClient.cancelQueries();
    this.deps.queryClient.clear();
    this.deps.tokens.set(switched.accessToken, expiresAtMs);
    const claims = readAccessTokenClaims(switched.accessToken);
    if (claims === null) {
      throw new Error('The access token has no readable claims');
    }
    const me = await this.deps.api.auth.me();
    const user = toSessionUser(me, claims, this.deps.clock.nowMs());
    this.admit(user);
    this.scheduleRenewal(expiresAtMs);
    return user;
  }

  /**
   * Publishes the signed-in person and remembers a hint for their aqueduct (no secrets). If the
   * identity (person or aqueduct) is not the one the cache was filled for, the cache is emptied.
   */
  private admit(user: SessionUser): void {
    const identity = `${user.userId}@${user.aqueductId}`;
    if (this.cacheIdentity !== null && this.cacheIdentity !== identity) {
      this.deps.queryClient.clear();
    }
    this.cacheIdentity = identity;
    if (user.role === LOCAL_MODE_ROLE) {
      this.deps.hints.put(toSessionHint(user, this.deps.clock.nowMs(), OPERATOR_SESSION_HINT_MS));
    }
    this.deps.store.signIn(user);
  }

  /** Forgets the token, the cache and (unless the server was just unreachable) the hints. */
  private cleanUp(keepHints = false): void {
    this.cacheIdentity = null;
    if (!keepHints) {
      this.deps.hints.clear();
    }
    this.cancelRenewal?.();
    this.cancelRenewal = null;
    this.deps.tokens.clear();
    this.deps.queryClient.clear();
  }

  /** A failed clear must not keep the person signed in; the copies are simply read again later. */
  private async clearReferences(): Promise<void> {
    try {
      await this.deps.references?.clear();
    } catch {
      // Nothing else depends on it: the next online read replaces the copies.
    }
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
      this.admit(toSessionUser(me, claims, this.deps.clock.nowMs()));
    } catch (error) {
      const offline = error instanceof NetworkError;
      this.cleanUp(offline);
      this.deps.store.clear(offline ? 'offline' : undefined);
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
