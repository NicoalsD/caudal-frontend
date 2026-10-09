import type { SessionUser } from '../core/session/SessionState';
import type { Clock } from '../core/time/Clock';
import type { CaudalApi } from '../services/api/CaudalApi';
import type { AuthUserView } from '../services/api/views';
import type { TokenStore } from '../services/session/TokenStore';
import type { SessionStore } from './SessionStore';

const MS_PER_SECOND = 1000;

export interface SessionControllerDependencies {
  readonly api: CaudalApi;
  readonly tokens: TokenStore;
  readonly store: SessionStore;
  readonly clock: Clock;
}

export function toSessionUser(user: AuthUserView): SessionUser {
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    aqueductId: user.aqueductId,
    displayName: user.fullName,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * Orchestrates the session life cycle: the token goes to the in-memory TokenStore and the
 * non-secret facts about the person go to the observable SessionStore.
 */
export class SessionController {
  constructor(private readonly deps: SessionControllerDependencies) {}

  /** Signs in. Rejects with the API error (the form shows a generic text). */
  async signIn(credentials: {
    readonly username: string;
    readonly password: string;
  }): Promise<SessionUser> {
    const login = await this.deps.api.auth.login(credentials);
    this.deps.tokens.set(
      login.accessToken,
      this.deps.clock.nowMs() + login.expiresInSeconds * MS_PER_SECOND,
    );
    const user = toSessionUser(login.user);
    this.deps.store.signIn(user);
    return user;
  }
}
