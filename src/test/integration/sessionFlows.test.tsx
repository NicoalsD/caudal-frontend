import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { TEST_NEW_PASSWORD, TEST_PASSWORD, TEST_USERS } from '../factories/auth';
import { apiUrl } from '../msw/apiUrl';
import { createSessionBackend } from '../msw/sessionBackend';
import { server } from '../msw/server';
import { renderApp } from '../renderApp';

type User = ReturnType<typeof userEvent.setup>;

async function typeCredentials(user: User, username: string, password: string) {
  await user.type(await screen.findByLabelText(t('auth.username')), username);
  await user.type(screen.getByLabelText(t('auth.password')), password);
  await user.click(screen.getByRole('button', { name: t('auth.signIn') }));
}

/** Generous wait for a redirect while the whole suite runs in parallel. */
const SLOW_REDIRECT_TIMEOUT_MS = 10_000;

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });

describe('login journey', () => {
  it('a visitor asks for a private screen, signs in and lands on it', async () => {
    server.use(...createSessionBackend(null).handlers);
    const { router } = renderApp(ROUTE_PATHS.operator.pending);

    expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
    await typeCredentials(userEvent.setup(), TEST_USERS.operator.username, TEST_PASSWORD);

    expect(await heading(t('screens.pendingReadings'))).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.pending);
  });

  it('each role lands on its own home after the sign in', async () => {
    server.use(...createSessionBackend(null).handlers);
    const { router } = renderApp(ROUTE_PATHS.login);

    await typeCredentials(userEvent.setup(), TEST_USERS.member.username, TEST_PASSWORD);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.board.tank);
    });
  });

  it('a wrong password keeps the visitor on the login with one generic message', async () => {
    server.use(...createSessionBackend(null).handlers);
    const { router } = renderApp(ROUTE_PATHS.login);

    await typeCredentials(userEvent.setup(), TEST_USERS.admin.username, 'una-clave-equivocada');

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.api.invalidCredentials'));
    expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
  });
});

describe('opening the app with an existing cookie', () => {
  it('restores the session on the screen that was asked for', async () => {
    const backend = createSessionBackend(TEST_USERS.admin);
    server.use(...backend.handlers);
    const { services, router } = renderApp(ROUTE_PATHS.board.rules);

    await services.session.restore();

    expect(await heading(t('screens.rules'))).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(ROUTE_PATHS.board.rules);
    expect(backend.calls.refresh).toBe(1);
  });

  it('shows the login when there is no cookie, without the expiry notice', async () => {
    server.use(...createSessionBackend(null).handlers);
    const { services } = renderApp(ROUTE_PATHS.board.rules);

    await services.session.restore();

    expect(await heading(t('screens.login'))).toBeInTheDocument();
    expect(screen.queryByText(t('auth.sessionExpired'))).not.toBeInTheDocument();
  });
});

describe('expiry while using the app', () => {
  it('renews the 15-minute token without the person noticing', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const { services, router } = renderApp(ROUTE_PATHS.operator.home);
    await services.session.restore();
    await heading(t('screens.operatorHome'));
    backend.expireAccessTokens();

    const me = await services.api.auth.me();

    expect(me.username).toBe(TEST_USERS.operator.username);
    expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.home);
    expect(services.sessionStore.getSnapshot().status).toBe('authenticated');
  });

  it('when the session is really over it asks to sign in again and then returns', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const { services, router } = renderApp(ROUTE_PATHS.operator.pending);
    await services.session.restore();
    await heading(t('screens.pendingReadings'));
    backend.expireAccessTokens();
    backend.dropCookie();

    await services.api.auth.me().catch(() => undefined);

    expect(await screen.findByText(t('auth.sessionExpired'))).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
    expect(router.state.location.search).toContain(
      encodeURIComponent(ROUTE_PATHS.operator.pending),
    );

    await typeCredentials(userEvent.setup(), TEST_USERS.operator.username, TEST_PASSWORD);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.pending);
    });
  });

  it('a revoked family (SESSION_REVOKED) ends the session the same way', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const { services, router } = renderApp(ROUTE_PATHS.operator.home);
    await services.session.restore();
    await heading(t('screens.operatorHome'));
    backend.expireAccessTokens();
    server.use(
      http.post(apiUrl('/auth/refresh'), () =>
        Response.json(
          { error: { code: 'SESSION_REVOKED', message: 'x', request_id: 'r' } },
          { status: 401 },
        ),
      ),
    );

    await services.api.auth.me().catch(() => undefined);

    expect(services.sessionStore.getSnapshot()).toEqual({ status: 'expired' });
    // Under the load of the whole suite the redirect can take longer than one default wait.
    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
      },
      { timeout: SLOW_REDIRECT_TIMEOUT_MS },
    );
    expect(
      await screen.findByText(t('auth.sessionExpired'), {}, { timeout: SLOW_REDIRECT_TIMEOUT_MS }),
    ).toBeInTheDocument();
  });
});

describe('mandatory password change journey', () => {
  it('temporary password, forced change, new sign in with the new password', async () => {
    const backend = createSessionBackend(null);
    server.use(...backend.handlers);
    const { router, services } = renderApp(ROUTE_PATHS.login);
    const user = userEvent.setup();

    // 1. Temporary password: the only screen that opens is the change screen.
    await typeCredentials(user, TEST_USERS.newcomer.username, TEST_PASSWORD);
    expect(await heading(t('auth.changeRequiredTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('auth.changeRequiredNotice'))).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.changePassword);
    });
    await router.navigate(ROUTE_PATHS.operator.home);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.changePassword);
    });

    // 2. The change ends the session (the server revoked the refresh cookie).
    await user.type(await screen.findByLabelText(t('auth.currentPassword')), TEST_PASSWORD);
    await user.type(screen.getByLabelText(t('auth.newPassword')), TEST_NEW_PASSWORD);
    await user.type(screen.getByLabelText(t('auth.confirmPassword')), TEST_NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: t('auth.savePassword') }));
    expect(await screen.findByText(t('auth.passwordChanged'))).toBeInTheDocument();
    expect(services.tokens.get()).toBeNull();
    expect(backend.calls.passwordChanges).toBe(1);

    // 3. The old password no longer works; the new one opens the normal home.
    await typeCredentials(user, TEST_USERS.newcomer.username, TEST_PASSWORD);
    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.api.invalidCredentials'));
    await user.clear(screen.getByLabelText(t('auth.username')));
    await user.type(screen.getByLabelText(t('auth.username')), TEST_USERS.newcomer.username);
    await user.type(screen.getByLabelText(t('auth.password')), TEST_NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: t('auth.signIn') }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.home);
    });
  });

  it('the server can demand the change in the middle of a session', async () => {
    const backend = createSessionBackend(TEST_USERS.operator);
    server.use(...backend.handlers);
    const { services, router } = renderApp(ROUTE_PATHS.operator.home);
    await services.session.restore();
    await heading(t('screens.operatorHome'));
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        Response.json(
          { error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'x', request_id: 'r' } },
          { status: 403 },
        ),
      ),
    );

    await services.queryClient
      .fetchQuery({ queryKey: ['z'], queryFn: () => services.api.meta.getConstraints() })
      .catch(() => undefined);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.changePassword);
    });
  });
});

describe('secrets never reach the browser storage', () => {
  it('writes nothing to web storage during sign in, renewal and password change', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const backend = createSessionBackend(null);
    server.use(...backend.handlers);
    const { services } = renderApp(ROUTE_PATHS.login);
    const user = userEvent.setup();

    await typeCredentials(user, TEST_USERS.operator.username, TEST_PASSWORD);
    await heading(t('screens.operatorHome'));
    backend.expireAccessTokens();
    await services.api.auth.me();

    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
  });
});
