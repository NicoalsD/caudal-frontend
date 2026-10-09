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
