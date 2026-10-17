import { describe, expect, it } from 'vitest';

import {
  AnonymousPhase,
  AuthenticatedPhase,
  ExpiredPhase,
  PasswordChangePendingPhase,
  RestoringPhase,
} from './SessionPhase';
import type { SessionEvent, SessionPhase, SessionPhaseName } from './SessionPhase';
import type { SessionUser } from './SessionState';

const USER: SessionUser = {
  userId: 'u-1',
  username: 'junta.uno',
  role: 'BOARD_ADMIN',
  aqueductId: 'a-1',
  displayName: 'Persona Uno',
  mustChangePassword: false,
  permissions: ['RULESET_ACTIVATE'],
  memberships: [],
};
const FORCED: SessionUser = { ...USER, mustChangePassword: true };

const EVENTS = {
  restoreStarted: { type: 'RESTORE_STARTED' },
  restoreFailedOnline: { type: 'RESTORE_FAILED', offline: false },
  restoreFailedOffline: { type: 'RESTORE_FAILED', offline: true },
  signedIn: { type: 'SIGNED_IN', user: USER },
  signedInForced: { type: 'SIGNED_IN', user: FORCED },
  changeRequired: { type: 'PASSWORD_CHANGE_REQUIRED' },
  changed: { type: 'PASSWORD_CHANGED' },
  expired: { type: 'EXPIRED' },
  signedOut: { type: 'SIGNED_OUT' },
} satisfies Record<string, SessionEvent>;

const PHASES: Record<SessionPhaseName, () => SessionPhase> = {
  RESTORING: () => new RestoringPhase(),
  ANONYMOUS: () => new AnonymousPhase(),
  AUTHENTICATED: () => new AuthenticatedPhase(USER),
  PASSWORD_CHANGE_PENDING: () => new PasswordChangePendingPhase(USER),
  EXPIRED: () => new ExpiredPhase(),
};

/** [state, event, expected state name, or "same" when the event is ignored]. */
const TABLE: [SessionPhaseName, keyof typeof EVENTS, SessionPhaseName | 'same'][] = [
  ['ANONYMOUS', 'restoreStarted', 'RESTORING'],
  ['ANONYMOUS', 'signedIn', 'AUTHENTICATED'],
  ['ANONYMOUS', 'signedInForced', 'PASSWORD_CHANGE_PENDING'],
  ['ANONYMOUS', 'signedOut', 'ANONYMOUS'],
  ['ANONYMOUS', 'expired', 'same'],
  ['ANONYMOUS', 'changed', 'same'],
  ['ANONYMOUS', 'changeRequired', 'same'],
  ['ANONYMOUS', 'restoreFailedOffline', 'same'],
  ['RESTORING', 'signedIn', 'AUTHENTICATED'],
  ['RESTORING', 'signedInForced', 'PASSWORD_CHANGE_PENDING'],
  ['RESTORING', 'restoreFailedOnline', 'ANONYMOUS'],
  ['RESTORING', 'restoreFailedOffline', 'ANONYMOUS'],
  ['RESTORING', 'signedOut', 'ANONYMOUS'],
  ['RESTORING', 'expired', 'same'],
  ['RESTORING', 'restoreStarted', 'same'],
  ['AUTHENTICATED', 'changeRequired', 'PASSWORD_CHANGE_PENDING'],
  ['AUTHENTICATED', 'changed', 'ANONYMOUS'],
  ['AUTHENTICATED', 'expired', 'EXPIRED'],
  ['AUTHENTICATED', 'signedOut', 'ANONYMOUS'],
  ['AUTHENTICATED', 'signedIn', 'AUTHENTICATED'],
  ['AUTHENTICATED', 'signedInForced', 'PASSWORD_CHANGE_PENDING'],
  ['AUTHENTICATED', 'restoreStarted', 'same'],
  ['AUTHENTICATED', 'restoreFailedOffline', 'same'],
  ['PASSWORD_CHANGE_PENDING', 'changed', 'ANONYMOUS'],
  ['PASSWORD_CHANGE_PENDING', 'expired', 'EXPIRED'],
  ['PASSWORD_CHANGE_PENDING', 'signedOut', 'ANONYMOUS'],
  ['PASSWORD_CHANGE_PENDING', 'signedIn', 'AUTHENTICATED'],
  ['PASSWORD_CHANGE_PENDING', 'changeRequired', 'same'],
  ['PASSWORD_CHANGE_PENDING', 'restoreStarted', 'same'],
  ['EXPIRED', 'restoreStarted', 'RESTORING'],
  ['EXPIRED', 'signedIn', 'AUTHENTICATED'],
  ['EXPIRED', 'signedInForced', 'PASSWORD_CHANGE_PENDING'],
  ['EXPIRED', 'signedOut', 'ANONYMOUS'],
  ['EXPIRED', 'changed', 'same'],
  ['EXPIRED', 'expired', 'same'],
];

describe('SessionPhase transitions', () => {
  it.each(TABLE)('%s receiving %s goes to %s', (from, event, expected) => {
    const start = PHASES[from]();
    const next = start.next(EVENTS[event]);

    if (expected === 'same') {
      expect(next).toBe(start);
    } else {
      expect(next.name).toBe(expected);
    }
  });

  it('covers every state with at least one ignored and one accepted event', () => {
    for (const name of Object.keys(PHASES) as SessionPhaseName[]) {
      const rows = TABLE.filter(([from]) => from === name);
      expect(
        rows.some(([, , to]) => to === 'same'),
        name,
      ).toBe(true);
      expect(
        rows.some(([, , to]) => to !== 'same'),
        name,
      ).toBe(true);
    }
  });
});

describe('SessionPhase snapshots', () => {
  it('shows who is signed in and flags the pending password change', () => {
    expect(new AuthenticatedPhase(USER).snapshot).toEqual({ status: 'authenticated', user: USER });
    expect(new PasswordChangePendingPhase(USER).snapshot).toEqual({
      status: 'authenticated',
      user: FORCED,
    });
  });

  it('keeps the person but forces the flag when the server demands the change', () => {
    const next = new AuthenticatedPhase(USER).next(EVENTS.changeRequired);

    expect(next.snapshot).toEqual({ status: 'authenticated', user: FORCED });
  });

  it('explains why the anonymous state exists', () => {
    const offline = new RestoringPhase().next(EVENTS.restoreFailedOffline);
    const changed = new AuthenticatedPhase(USER).next(EVENTS.changed);

    expect(offline.snapshot).toEqual({ status: 'anonymous', reason: 'offline' });
    expect(changed.snapshot).toEqual({ status: 'anonymous', reason: 'password-changed' });
    expect(new AnonymousPhase().snapshot).toEqual({ status: 'anonymous' });
  });

  it('keeps the same snapshot object while the state does not change', () => {
    const phase = new AuthenticatedPhase(USER);

    expect(phase.next(EVENTS.restoreStarted).snapshot).toBe(phase.snapshot);
  });
});

describe('a session snapshot holds no secrets', () => {
  const FORBIDDEN = /token|password|secret|cookie|authorization|bearer/i;

  it('has only non-secret user facts, whatever the state', () => {
    const snapshots = Object.values(PHASES).map((build) => JSON.stringify(build().snapshot));

    for (const text of snapshots) {
      // "mustChangePassword" is a yes/no flag, not a password: remove it before looking.
      expect(text.replace('mustChangePassword', ''), text).not.toMatch(FORBIDDEN);
    }
    expect(Object.keys(USER).sort()).toEqual(
      [
        'aqueductId',
        'displayName',
        'memberships',
        'mustChangePassword',
        'permissions',
        'role',
        'userId',
        'username',
      ].sort(),
    );
  });
});

describe('privacy notice pending', () => {
  it('marks an authenticated person until the notice is accepted', () => {
    const pending = new AuthenticatedPhase(USER).next({ type: 'PRIVACY_NOTICE_PENDING' });
    expect(pending.name).toBe('AUTHENTICATED');
    expect(pending.snapshot).toMatchObject({
      status: 'authenticated',
      user: { privacyNoticePending: true },
    });

    const accepted = pending.next({ type: 'PRIVACY_NOTICE_ACCEPTED' });
    expect(accepted.snapshot).toMatchObject({ user: { privacyNoticePending: false } });
  });

  it('keeps the password change phase while the notice is pending', () => {
    const phase = new PasswordChangePendingPhase(USER).next({ type: 'PRIVACY_NOTICE_PENDING' });
    expect(phase.name).toBe('PASSWORD_CHANGE_PENDING');
    expect(phase.snapshot).toMatchObject({
      user: { mustChangePassword: true, privacyNoticePending: true },
    });
  });

  it('ignores the notice events when nobody is signed in', () => {
    const anonymous = new AnonymousPhase();
    expect(anonymous.next({ type: 'PRIVACY_NOTICE_PENDING' })).toBe(anonymous);
  });
});
