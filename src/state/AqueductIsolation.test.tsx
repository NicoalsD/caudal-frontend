import { describe, expect, it } from 'vitest';

import { createAppServices } from '../app/createAppServices';
import { OPERATOR_SESSION_HINT_MS } from '../core/policy/clientPolicy';
import { opensLocalMode } from '../core/session/SessionHint';
import { FakeClock } from '../test/fakes/FakeClock';
import {
  OTHER_AQUEDUCT_ID,
  TEST_AQUEDUCT_ID,
  TEST_PASSWORD,
  TEST_USERS,
} from '../test/factories/auth';
import type { MembershipDto } from '../test/factories/auth';
import { createSessionBackend } from '../test/msw/sessionBackend';
import { server } from '../test/msw/server';
import { aqueductKey } from './queryKeys';

const ENV = { VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL };
const START = 1_000;

const MEMBERSHIPS: MembershipDto[] = [
  { aqueduct_id: TEST_AQUEDUCT_ID, role: 'BOARD_ADMIN' },
  { aqueduct_id: OTHER_AQUEDUCT_ID, role: 'OPERATOR' },
];

async function signedInTwoAqueducts() {
  const backend = createSessionBackend(null, MEMBERSHIPS);
  server.use(...backend.handlers);
  const clock = new FakeClock(START);
  const services = createAppServices(ENV, clock);
  await services.session.signIn({
    username: TEST_USERS.multi.username,
    password: TEST_PASSWORD,
  });
  return { backend, services, clock };
}

describe('sessions per aqueduct', () => {
  it('lists the current memberships so the person can choose', async () => {
    const { services } = await signedInTwoAqueducts();

    expect(services.sessionStore.getSnapshot()).toMatchObject({
      status: 'authenticated',
      user: {
        role: 'BOARD_ADMIN',
        aqueductId: TEST_AQUEDUCT_ID,
        memberships: [
          { aqueductId: TEST_AQUEDUCT_ID, role: 'BOARD_ADMIN' },
          { aqueductId: OTHER_AQUEDUCT_ID, role: 'OPERATOR' },
        ],
      },
    });
  });

  it('works in the other aqueduct with that aqueduct role and a new token', async () => {
    const { services, backend } = await signedInTwoAqueducts();
    const before = services.tokens.get();

    const user = await services.session.switchAqueduct(OTHER_AQUEDUCT_ID);

    expect(user).toMatchObject({ role: 'OPERATOR', aqueductId: OTHER_AQUEDUCT_ID });
    expect(services.tokens.get()).not.toBe(before);
    expect(backend.calls.switches).toBe(1);
    expect(services.sessionStore.getSnapshot()).toMatchObject({
      user: { role: 'OPERATOR', aqueductId: OTHER_AQUEDUCT_ID },
    });
  });

  it('empties the cache of the first aqueduct when switching', async () => {
    const { services } = await signedInTwoAqueducts();
    const key = aqueductKey(TEST_AQUEDUCT_ID, 'rule-sets', 'current');
    services.queryClient.setQueryData(key, { secret: 'datos del primer acueducto' });

    await services.session.switchAqueduct(OTHER_AQUEDUCT_ID);

    expect(services.queryClient.getQueryData(key)).toBeUndefined();
    expect(services.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('drops an answer that arrives after the switch', async () => {
    const { services } = await signedInTwoAqueducts();
    const key = aqueductKey(TEST_AQUEDUCT_ID, 'slow');
    let release: (value: string) => void = () => undefined;
    const slow = new Promise<string>((resolve) => {
      release = resolve;
    });
    const running = services.queryClient.fetchQuery({ queryKey: key, queryFn: () => slow });
    running.catch(() => undefined);

    await services.session.switchAqueduct(OTHER_AQUEDUCT_ID);
    release('respuesta del primer acueducto');

    await running.catch(() => undefined);
    expect(services.queryClient.getQueryData(key)).toBeUndefined();
  });

  it('keeps the session and the cache when the server refuses the change', async () => {
    const { services } = await signedInTwoAqueducts();
    const key = aqueductKey(TEST_AQUEDUCT_ID, 'rule-sets');
    services.queryClient.setQueryData(key, 1);
    const token = services.tokens.get();

    await expect(
      services.session.switchAqueduct('0190f3a2-0000-7000-8000-0000000000cc'),
    ).rejects.toMatchObject({ status: 403 });

    expect(services.tokens.get()).toBe(token);
    expect(services.queryClient.getQueryData(key)).toBe(1);
    expect(services.sessionStore.getSnapshot()).toMatchObject({
      user: { aqueductId: TEST_AQUEDUCT_ID },
    });
  });

  it('empties the cache when another person signs in without signing out first', async () => {
    const { services, backend } = await signedInTwoAqueducts();
    const key = aqueductKey(TEST_AQUEDUCT_ID, 'rule-sets');
    services.queryClient.setQueryData(key, 1);
    backend.dropCookie();

    await services.session.signIn({ username: TEST_USERS.admin.username, password: TEST_PASSWORD });

    expect(services.queryClient.getQueryData(key)).toBeUndefined();
  });
});

describe('session hint per aqueduct', () => {
  it('remembers the operator of each aqueduct apart, without secrets', async () => {
    const backend = createSessionBackend(null, [
      { aqueduct_id: TEST_AQUEDUCT_ID, role: 'OPERATOR' },
      { aqueduct_id: OTHER_AQUEDUCT_ID, role: 'OPERATOR' },
    ]);
    server.use(...backend.handlers);
    const clock = new FakeClock(START);
    const services = createAppServices(ENV, clock);

    await services.session.signIn({
      username: TEST_USERS.operator.username,
      password: TEST_PASSWORD,
    });
    await services.session.switchAqueduct(OTHER_AQUEDUCT_ID);

    const first = services.hints.get(TEST_AQUEDUCT_ID);
    const second = services.hints.get(OTHER_AQUEDUCT_ID);
    expect(first?.aqueductId).toBe(TEST_AQUEDUCT_ID);
    expect(second?.aqueductId).toBe(OTHER_AQUEDUCT_ID);
    expect(second?.expiresAtMs).toBe(START + OPERATOR_SESSION_HINT_MS);
    expect(JSON.stringify([first, second])).not.toMatch(/token|password|cookie|bearer/i);
    expect(opensLocalMode(second, OTHER_AQUEDUCT_ID, 'OPERATOR', START)).toBe(true);
    expect(opensLocalMode(second, TEST_AQUEDUCT_ID, 'OPERATOR', START)).toBe(false);
  });

  it('keeps no hint for roles that need the server', async () => {
    const { services } = await signedInTwoAqueducts();

    expect(services.hints.get(TEST_AQUEDUCT_ID)).toBeNull();
  });

  it('forgets every hint on sign out', async () => {
    const backend = createSessionBackend(null);
    server.use(...backend.handlers);
    const services = createAppServices(ENV, new FakeClock(START));
    await services.session.signIn({
      username: TEST_USERS.operator.username,
      password: TEST_PASSWORD,
    });
    expect(services.hints.get(TEST_AQUEDUCT_ID)).not.toBeNull();

    await services.session.logout();

    expect(services.hints.get(TEST_AQUEDUCT_ID)).toBeNull();
  });

  it('keeps the hint when the app starts without connection', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    backend.failNextRefreshWithNetworkError();
    server.use(...backend.handlers);
    const services = createAppServices(ENV, new FakeClock(START));
    services.hints.put({
      userId: TEST_USERS.operator.id,
      role: 'OPERATOR',
      aqueductId: TEST_AQUEDUCT_ID,
      displayName: 'Persona Fontanera',
      expiresAtMs: START + OPERATOR_SESSION_HINT_MS,
    });

    await services.session.restore();

    expect(services.sessionStore.getSnapshot()).toEqual({ status: 'anonymous', reason: 'offline' });
    expect(services.hints.get(TEST_AQUEDUCT_ID)).not.toBeNull();
  });
});

describe('aqueductKey', () => {
  it('puts the aqueduct id first so keys of two aqueducts never collide', () => {
    expect(aqueductKey('a-1', 'rule-sets', 'current')).toEqual([
      'aqueduct',
      'a-1',
      'rule-sets',
      'current',
    ]);
    expect(aqueductKey('a-1', 'x')).not.toEqual(aqueductKey('a-2', 'x'));
  });
});
