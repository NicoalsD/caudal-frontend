import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { SubmitReadingCommand } from '../core/commands/SubmitReadingCommand';
import { ROUTE_PATHS } from '../core/session/routes';
import type { Scheduler } from '../core/time/Scheduler';
import { t } from '../i18n/t';
import { createAppServices } from '../app/createAppServices';
import { OfflineDatabase } from '../services/offline/OfflineDatabase';
import { FakeClock } from '../test/fakes/FakeClock';
import { ACCESS_TOKEN_SECONDS, TEST_PASSWORD, TEST_USERS } from '../test/factories/auth';
import { apiUrl } from '../test/msw/apiUrl';
import { errorResponse } from '../test/msw/errorResponse';
import { createSessionBackend } from '../test/msw/sessionBackend';
import { server } from '../test/msw/server';
import { STATUS } from '../test/constants';
import { renderApp } from '../test/renderApp';

const ENV = { VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL };
const MS_PER_SECOND = 1000;
const RENEWAL_FRACTION = 0.8;
const ONE_REFRESH = 1;
const TWO_REFRESHES = 2;

/** A scheduler that keeps the tasks so a test can run them when it wants. */
class ManualScheduler implements Scheduler {
  readonly delays: number[] = [];
  readonly tasks: (() => void)[] = [];
  readonly cancelled: number[] = [];

  after(delayMs: number, task: () => void): () => void {
    const index = this.tasks.length;
    this.delays.push(delayMs);
    this.tasks.push(task);
    return () => {
      this.cancelled.push(index);
    };
  }
}

describe('SessionController.restore (boot)', () => {
  it('turns a valid refresh cookie into a signed-in session with its role and permissions', async () => {
    const backend = createSessionBackend(TEST_USERS.admin);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);

    const pending = services.session.restore();
    expect(services.sessionStore.getSnapshot().status).toBe('restoring');
    await pending;

    expect(services.sessionStore.getSnapshot()).toMatchObject({
      status: 'authenticated',
      user: {
        role: 'BOARD_ADMIN',
        aqueductId: TEST_USERS.admin.aqueduct_id,
        permissions: expect.arrayContaining(['RULESET_ACTIVATE']) as string[],
      },
    });
    expect(services.tokens.get()).not.toBeNull();
  });

  it('keeps the public data in the cache when there was no session to restore', async () => {
    server.use(
      http.post(apiUrl('/auth/refresh'), () => errorResponse(STATUS.unauthorized, 'UNAUTHORIZED')),
    );
    const services = createAppServices(ENV);
    const publicKey = ['public', 'schedule', 'vereda'];
    services.queryClient.setQueryData(publicKey, { loaded: true });

    await services.session.restore();

    expect(services.sessionStore.getSnapshot().status).toBe('anonymous');
    expect(services.queryClient.getQueryData(publicKey)).toEqual({ loaded: true });
  });

  it('refreshes only once even if restore is called twice (StrictMode)', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);

    await Promise.all([services.session.restore(), services.session.restore()]);

    expect(backend.calls.refresh).toBe(ONE_REFRESH);
  });

  it('is anonymous, not expired, when there is no cookie', async () => {
    const backend = createSessionBackend(null);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);

    await services.session.restore();

    expect(services.sessionStore.getSnapshot()).toEqual({ status: 'anonymous' });
  });

  it('keeps the offline reason when the server cannot be reached', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    backend.failNextRefreshWithNetworkError();
    server.use(...backend.handlers);
    const services = createAppServices(ENV);

    await services.session.restore();

    expect(services.sessionStore.getSnapshot()).toEqual({ status: 'anonymous', reason: 'offline' });
  });

  it('shows the login with the offline notice, not "session expired"', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    backend.failNextRefreshWithNetworkError();
    server.use(...backend.handlers);
    const { services } = renderApp(ROUTE_PATHS.operator.home);

    await services.session.restore();

    expect(await screen.findByText(t('auth.offlineLogin'))).toBeInTheDocument();
    expect(screen.queryByText(t('auth.sessionExpired'))).not.toBeInTheDocument();
  });

  it('waits on a loading message instead of redirecting while it restores', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    // The refresh waits until the loading message was seen; returning nothing hands the request
    // to the fake backend below, so a fast machine cannot finish the restore before the check.
    server.use(
      http.post(apiUrl('/auth/refresh'), async () => {
        await gate;
      }),
      ...backend.handlers,
    );
    const { services, router } = renderApp(ROUTE_PATHS.operator.home);

    const pending = services.session.restore();
    expect(await screen.findByText(t('auth.restoring'))).toBeInTheDocument();
    release();
    await pending;

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.home);
    });
    expect(screen.queryByText(t('auth.restoring'))).not.toBeInTheDocument();
  });
});

describe('401 and expiry during use', () => {
  it('renews the token once and repeats the call that got a 401', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);
    await services.session.restore();
    backend.expireAccessTokens();

    const me = await services.api.auth.me();

    expect(me.username).toBe(TEST_USERS.operator.username);
    expect(backend.calls.refresh).toBe(TWO_REFRESHES); // boot + this 401
  });

  it('shares one refresh among parallel calls that all get 401', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);
    await services.session.restore();
    backend.expireAccessTokens();

    await Promise.all([services.api.auth.me(), services.api.auth.me(), services.api.auth.me()]);

    expect(backend.calls.refresh).toBe(TWO_REFRESHES);
  });

  it('closes the session and clears the query cache when the refresh is refused', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);
    await services.session.restore();
    services.queryClient.setQueryData(['datos', 'privados'], { secreto: true });
    backend.expireAccessTokens();
    backend.dropCookie();

    await expect(services.api.auth.me()).rejects.toMatchObject({ status: STATUS.unauthorized });

    expect(services.sessionStore.getSnapshot()).toEqual({ status: 'expired' });
    expect(services.tokens.get()).toBeNull();
    expect(services.queryClient.getQueryData(['datos', 'privados'])).toBeUndefined();
  });

  it('keeps the session when the refresh fails only because there is no connection', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);
    await services.session.restore();
    backend.expireAccessTokens();
    server.use(http.post(apiUrl('/auth/refresh'), () => HttpResponse.error()));

    await expect(services.api.auth.me()).rejects.toThrow('Network request failed');

    expect(services.sessionStore.getSnapshot().status).toBe('authenticated');
  });

  it('sends the visitor to the login with the notice when the session expires', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const { services, router } = renderApp(ROUTE_PATHS.operator.home);
    await services.session.restore();
    await screen.findByRole('heading', { level: 1, name: t('screens.operatorHome') });
    backend.expireAccessTokens();
    backend.dropCookie();

    await services.api.auth.me().catch(() => undefined);

    expect(await screen.findByText(t('auth.sessionExpired'))).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
  });
});

describe('background renewal', () => {
  it('schedules the refresh at 80 % of the token life and reschedules after each one', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const scheduler = new ManualScheduler();
    const services = createAppServices(ENV, new FakeClock(), scheduler);

    await services.session.restore();
    expect(scheduler.delays).toEqual([ACCESS_TOKEN_SECONDS * MS_PER_SECOND * RENEWAL_FRACTION]);

    scheduler.tasks[0]?.();
    await waitFor(() => {
      expect(scheduler.tasks).toHaveLength(TWO_REFRESHES);
    });
    expect(backend.calls.refresh).toBe(TWO_REFRESHES);
    expect(scheduler.cancelled).toEqual([0]);
  });

  it('stops renewing after sign out', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const scheduler = new ManualScheduler();
    const services = createAppServices(ENV, new FakeClock(), scheduler);
    await services.session.restore();

    await services.session.logout();

    expect(scheduler.cancelled).toEqual([0]);
  });
});

describe('sign out', () => {
  it('revokes on the server, forgets the token and clears the cache', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);
    await services.session.restore();
    services.queryClient.setQueryData(['datos'], 1);

    await services.session.logout();

    expect(backend.calls.logout).toBe(ONE_REFRESH);
    expect(services.tokens.get()).toBeNull();
    expect(services.sessionStore.getSnapshot()).toEqual({ status: 'anonymous' });
    expect(services.queryClient.getQueryData(['datos'])).toBeUndefined();
  });

  it('keeps the queued readings and clears the reference copies', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);
    const user = await services.session.signIn({
      username: TEST_USERS.operator.username,
      password: TEST_PASSWORD,
    });
    const clientId = `queued-${crypto.randomUUID()}`;
    const cacheKey = `${user.aqueductId}|tanks-${clientId}`;
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand(clientId, {
        tankId: 't-1',
        gaugeValue: 2.1,
        waterAppearanceCode: 'NORMAL',
        damageNoticed: false,
        note: '',
        observedAt: '2026-10-14T08:00:00.000Z',
      }),
      { userId: user.userId, aqueductId: user.aqueductId },
      null,
    );
    await OfflineDatabase.shared.referenceCache.put({
      key: cacheKey,
      aqueductId: user.aqueductId,
      fetchedAtMs: 1,
      payload: [],
    });

    await services.session.logout();

    expect(await OfflineDatabase.shared.outbox.get(clientId)).toBeDefined();
    expect(await OfflineDatabase.shared.referenceCache.get(cacheKey)).toBeUndefined();
  });

  it('closes the local session even if the server is unreachable', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);
    await services.session.restore();
    server.use(http.post(apiUrl('/auth/logout'), () => HttpResponse.error()));

    await services.session.logout();

    expect(services.tokens.get()).toBeNull();
    expect(services.sessionStore.getSnapshot().status).toBe('anonymous');
  });
});

describe('storage and cookie rules', () => {
  it('never writes to web storage or IndexedDB-like globals while signing in and refreshing', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const services = createAppServices(ENV);

    await services.session.signIn({
      username: TEST_USERS.operator.username,
      password: TEST_PASSWORD,
    });
    backend.expireAccessTokens();
    await services.api.auth.me();

    const token = services.tokens.get();
    expect(token).not.toBeNull();
    expect(setItem).not.toHaveBeenCalled();
    // The hint is stored in IndexedDB (the aqueduct's operator), but never the access token.
    await vi.waitFor(async () => {
      expect(await OfflineDatabase.shared.sessionHints.count()).toBe(1);
    });
    expect(JSON.stringify(await OfflineDatabase.shared.sessionHints.toArray())).not.toContain(
      token ?? '',
    );
  });

  it('is refused by the server when X-Requested-With is missing, and the client always sends it', async () => {
    const seen: (string | null)[] = [];
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(
      http.post(apiUrl('/auth/refresh'), ({ request }) => {
        seen.push(request.headers.get('X-Requested-With'));
        return errorResponse(STATUS.unauthorized, 'UNAUTHORIZED');
      }),
      ...backend.handlers,
    );
    const services = createAppServices(ENV);

    await services.session.restore();

    expect(seen).toEqual(['caudal-web']);
    const bare = await fetch(apiUrl('/auth/refresh'), { method: 'POST' });
    expect(bare.status).toBe(STATUS.unauthorized);
  });
});

describe('sign in through the form', () => {
  it('uses the sign in path and schedules the renewal', async () => {
    const backend = createSessionBackend(null);
    server.use(...backend.handlers);
    const scheduler = new ManualScheduler();
    const { services } = renderApp(ROUTE_PATHS.login, { scheduler });

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(t('auth.username')), TEST_USERS.admin.username);
    await user.type(screen.getByLabelText(t('auth.password')), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: t('auth.signIn') }));

    await waitFor(() => {
      expect(services.sessionStore.getSnapshot().status).toBe('authenticated');
    });
    expect(scheduler.delays).toHaveLength(ONE_REFRESH);
    expect(backend.calls.login).toBe(ONE_REFRESH);
  });
});
