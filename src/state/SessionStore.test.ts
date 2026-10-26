import { describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '../core/session/SessionState';
import { buildSessionUser } from '../test/factories/session';
import { SessionStore } from './SessionStore';

const USER: SessionUser = buildSessionUser({ displayName: 'Fontanero de prueba' });

const TRANSITIONS = 3;

describe('SessionStore', () => {
  it('starts anonymous', () => {
    expect(new SessionStore().getSnapshot()).toEqual({ status: 'anonymous' });
  });

  it('ignores a second beginRestore quietly while it is already restoring', () => {
    const onIgnored = vi.fn();
    const store = new SessionStore(onIgnored);
    store.beginRestore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.beginRestore();

    expect(store.getSnapshot()).toEqual({ status: 'restoring' });
    expect(listener).not.toHaveBeenCalled();
    expect(onIgnored).not.toHaveBeenCalled();
  });

  it('notifies subscribers on every transition', () => {
    const store = new SessionStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.signIn(USER);
    expect(store.getSnapshot()).toEqual({ status: 'authenticated', user: USER });

    store.expire();
    expect(store.getSnapshot()).toEqual({ status: 'expired' });

    store.clear();
    expect(store.getSnapshot()).toEqual({ status: 'anonymous' });
    expect(listener).toHaveBeenCalledTimes(TRANSITIONS);
  });

  it('stops notifying after unsubscribe', () => {
    const store = new SessionStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.signIn(USER);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('SessionStore with the State pattern', () => {
  it('returns the same snapshot object until the state changes', () => {
    const store = new SessionStore();
    store.signIn(USER);

    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it('reports an event the current state ignores', () => {
    const ignored: [string, string][] = [];
    const store = new SessionStore((event, phase) => ignored.push([event, phase]));
    const listener = vi.fn();
    store.subscribe(listener);

    store.expire();

    expect(ignored).toEqual([['EXPIRED', 'ANONYMOUS']]);
    expect(listener).not.toHaveBeenCalled();
  });

  it('opens only the change screen after PASSWORD_CHANGE_REQUIRED', () => {
    const store = new SessionStore();
    store.signIn(USER);

    store.requirePasswordChange();

    expect(store.getSnapshot()).toMatchObject({ user: { mustChangePassword: true } });
  });

  it('a plain clear during the restore means "no session", not offline', () => {
    const store = new SessionStore();
    store.beginRestore();

    store.clear();

    expect(store.getSnapshot()).toEqual({ status: 'anonymous' });
  });

  it('a password change ends the session with a reason for the login screen', () => {
    const store = new SessionStore();
    store.signIn(USER);

    store.clear('password-changed');

    expect(store.getSnapshot()).toEqual({ status: 'anonymous', reason: 'password-changed' });
  });
});
