import { describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '../core/session/SessionState';
import { SessionStore } from './SessionStore';

const USER: SessionUser = {
  userId: '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a81',
  role: 'OPERATOR',
  aqueductId: '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a82',
  displayName: 'Fontanero de prueba',
};

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
