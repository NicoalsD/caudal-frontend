import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { STATUS } from '../../test/constants';
import { ACCESS_TOKEN_SECONDS, TEST_PASSWORD, TEST_USERS } from '../../test/factories/auth';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  username: string,
  password: string,
) {
  await user.type(await screen.findByLabelText(t('auth.username')), username);
  await user.type(screen.getByLabelText(t('auth.password')), password);
  await user.click(screen.getByRole('button', { name: t('auth.signIn') }));
}

describe('login flow', () => {
  it('signs a fontanero in and opens the operator home', async () => {
    const { router, services } = renderApp(ROUTE_PATHS.login);

    await signIn(userEvent.setup(), TEST_USERS.operator.username, TEST_PASSWORD);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.home);
    });
    expect(services.sessionStore.getSnapshot()).toMatchObject({
      status: 'authenticated',
      user: { role: 'OPERATOR', username: TEST_USERS.operator.username },
    });
    expect(services.tokens.get()).not.toBeNull();
  });

  it('returns to the internal route asked for before the login', async () => {
    const next = encodeURIComponent(ROUTE_PATHS.board.rules);
    const { router } = renderApp(`${ROUTE_PATHS.login}?next=${next}`);

    await signIn(userEvent.setup(), TEST_USERS.admin.username, TEST_PASSWORD);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.board.rules);
    });
  });

  it('ignores an external next target', async () => {
    const next = encodeURIComponent('https://malo.example/robo');
    const { router } = renderApp(`${ROUTE_PATHS.login}?next=${next}`);

    await signIn(userEvent.setup(), TEST_USERS.admin.username, TEST_PASSWORD);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.board.tank);
    });
  });

  it('shows the same message for a wrong password and an unknown user', async () => {
    const { services } = renderApp(ROUTE_PATHS.login);
    const user = userEvent.setup();

    await signIn(user, TEST_USERS.operator.username, 'otra-contrasena-equivocada');
    const first = (await screen.findByRole('alert')).textContent;
    await signIn(user, 'no.existe', TEST_PASSWORD);
    await waitFor(() => {
      expect(screen.getByLabelText(t('auth.username'))).toHaveValue(
        `${TEST_USERS.operator.username}no.existe`,
      );
    });

    expect(first).toBe(t('errors.api.invalidCredentials'));
    expect(screen.getByRole('alert')).toHaveTextContent(first);
    expect(services.sessionStore.getSnapshot().status).toBe('anonymous');
    expect(services.tokens.get()).toBeNull();
  });

  it('keeps the form closed when the limits cannot be loaded', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        errorResponse(STATUS.badRequest, 'VALIDATION_ERROR'),
      ),
    );
    renderApp(ROUTE_PATHS.login);

    expect(await screen.findByText(t('connection.constraintsMissing'))).toBeInTheDocument();
    expect(screen.queryByLabelText(t('auth.username'))).not.toBeInTheDocument();
  });

  it('never writes the token or the password to web storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { router } = renderApp(ROUTE_PATHS.login);

    await signIn(userEvent.setup(), TEST_USERS.operator.username, TEST_PASSWORD);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.home);
    });

    expect(setItem).not.toHaveBeenCalled();
    expect(JSON.stringify({ ...localStorage })).not.toContain(TEST_PASSWORD);
    expect(ACCESS_TOKEN_SECONDS).toBeGreaterThan(0);
  });

  it('sends only the contract fields, with the browser headers', async () => {
    let seen: { body: unknown; requestedWith: string | null } | null = null;
    server.use(
      http.post(apiUrl('/auth/login'), async ({ request }) => {
        seen = {
          body: await request.json(),
          requestedWith: request.headers.get('X-Requested-With'),
        };
        return errorResponse(STATUS.unauthorized, 'INVALID_CREDENTIALS');
      }),
    );
    renderApp(ROUTE_PATHS.login);

    await signIn(userEvent.setup(), 'Junta.Uno', TEST_PASSWORD);
    await screen.findByRole('alert');

    expect(seen).toEqual({
      body: { username: 'junta.uno', password: TEST_PASSWORD },
      requestedWith: 'caudal-web',
    });
  });
});
