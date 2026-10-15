import type { SessionState, SessionUser } from './SessionState';

/** What can happen to a session. Events carry no tokens, cookies or passwords. */
export type SessionEvent =
  | { readonly type: 'RESTORE_STARTED' }
  | { readonly type: 'RESTORE_FAILED'; readonly offline: boolean }
  | { readonly type: 'SIGNED_IN'; readonly user: SessionUser }
  | { readonly type: 'PASSWORD_CHANGE_REQUIRED' }
  | { readonly type: 'PASSWORD_CHANGED' }
  | { readonly type: 'PRIVACY_NOTICE_PENDING' }
  | { readonly type: 'PRIVACY_NOTICE_ACCEPTED' }
  | { readonly type: 'EXPIRED' }
  | { readonly type: 'SIGNED_OUT' };

export type SessionPhaseName =
  'RESTORING' | 'ANONYMOUS' | 'AUTHENTICATED' | 'PASSWORD_CHANGE_PENDING' | 'EXPIRED';

/**
 * One state of the session (State pattern). Each state knows which events it accepts and returns
 * the state that follows; the rest are ignored (the same instance comes back) and the store logs
 * them. `snapshot()` is what the screens read: plain facts about the person, never a secret.
 *
 * @pattern P18 State
 */
export interface SessionPhase {
  readonly name: SessionPhaseName;
  readonly snapshot: SessionState;
  next(event: SessionEvent): SessionPhase;
}

/** The state a successful sign in leads to: the server may demand a password change first. */
function signedIn(user: SessionUser): SessionPhase {
  return user.mustChangePassword
    ? new PasswordChangePendingPhase(user)
    : new AuthenticatedPhase(user);
}

export class RestoringPhase implements SessionPhase {
  readonly name = 'RESTORING' as const;
  readonly snapshot: SessionState = { status: 'restoring' };

  next(event: SessionEvent): SessionPhase {
    switch (event.type) {
      case 'SIGNED_IN':
        return signedIn(event.user);
      case 'RESTORE_FAILED':
        return new AnonymousPhase(event.offline ? 'offline' : undefined);
      case 'SIGNED_OUT':
        return new AnonymousPhase();
      default:
        return this;
    }
  }
}

export class AnonymousPhase implements SessionPhase {
  readonly name = 'ANONYMOUS' as const;
  readonly snapshot: SessionState;

  constructor(reason?: 'offline' | 'password-changed') {
    this.snapshot =
      reason === undefined ? { status: 'anonymous' } : { status: 'anonymous', reason };
  }

  next(event: SessionEvent): SessionPhase {
    switch (event.type) {
      case 'RESTORE_STARTED':
        return new RestoringPhase();
      case 'SIGNED_IN':
        return signedIn(event.user);
      case 'SIGNED_OUT':
        return new AnonymousPhase();
      default:
        return this;
    }
  }
}

/** Shared by the two states with a person inside: only a few events change what they hold. */
abstract class SignedInPhase implements SessionPhase {
  abstract readonly name: SessionPhaseName;
  readonly snapshot: SessionState;

  constructor(protected readonly user: SessionUser) {
    this.snapshot = { status: 'authenticated', user };
  }

  next(event: SessionEvent): SessionPhase {
    switch (event.type) {
      case 'SIGNED_IN':
        return signedIn(event.user);
      case 'PASSWORD_CHANGED':
        return new AnonymousPhase('password-changed');
      case 'EXPIRED':
        return new ExpiredPhase();
      case 'SIGNED_OUT':
        return new AnonymousPhase();
      case 'PRIVACY_NOTICE_PENDING':
        return this.withUser({ ...this.user, privacyNoticePending: true });
      case 'PRIVACY_NOTICE_ACCEPTED':
        return this.withUser({ ...this.user, privacyNoticePending: false });
      default:
        return this.other(event);
    }
  }

  /** The same kind of phase with other facts about the person (the phase keeps its name). */
  protected abstract withUser(user: SessionUser): SessionPhase;

  protected abstract other(event: SessionEvent): SessionPhase;
}

export class AuthenticatedPhase extends SignedInPhase {
  readonly name = 'AUTHENTICATED' as const;

  protected withUser(user: SessionUser): SessionPhase {
    return new AuthenticatedPhase(user);
  }

  protected other(event: SessionEvent): SessionPhase {
    return event.type === 'PASSWORD_CHANGE_REQUIRED'
      ? new PasswordChangePendingPhase({ ...this.user, mustChangePassword: true })
      : this;
  }
}

/** Signed in, but the server only lets the person change the password or sign out. */
export class PasswordChangePendingPhase extends SignedInPhase {
  readonly name = 'PASSWORD_CHANGE_PENDING' as const;

  constructor(user: SessionUser) {
    super({ ...user, mustChangePassword: true });
  }

  protected withUser(user: SessionUser): SessionPhase {
    return new PasswordChangePendingPhase(user);
  }

  protected other(): SessionPhase {
    return this;
  }
}

export class ExpiredPhase implements SessionPhase {
  readonly name = 'EXPIRED' as const;
  readonly snapshot: SessionState = { status: 'expired' };

  next(event: SessionEvent): SessionPhase {
    switch (event.type) {
      case 'RESTORE_STARTED':
        return new RestoringPhase();
      case 'SIGNED_IN':
        return signedIn(event.user);
      case 'SIGNED_OUT':
        return new AnonymousPhase();
      default:
        return this;
    }
  }
}
