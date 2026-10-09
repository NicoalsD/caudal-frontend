import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { STATUS } from '../../test/constants';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { createSessionBackend } from '../../test/msw/sessionBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';
import { TEST_PASSWORD, TEST_USERS } from '../../test/factories/auth';

const forced = () => buildSessionUser({ mustChangePassword: true });

describe('mandatory password change', () => {
  it.each([
    ROUTE_PATHS.operator.home,
    ROUTE_PATHS.operator.newReading,
    ROUTE_PATHS.tank,
    ROUTE_PATHS.root,
  ])('sends a person who must change the password from %s to the change screen', async (path) => {
    const { router } = renderApp(path, { user: forced() });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.changePassword);
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: t('auth.changeRequiredTitle') }),
    ).toBeInTheDocument();
  });

  it('explains why nothing else opens', () => {
    renderApp(ROUTE_PATHS.changePassword, { user: forced() });

    expect(screen.getByRole('status')).toHaveTextContent(t('auth.changeRequiredNotice'));
  });

  it('does not show the notice when the change is voluntary', () => {
    renderApp(ROUTE_PATHS.changePassword, { user: buildSessionUser() });

    expect(
      screen.getByRole('heading', { level: 1, name: t('screens.changePassword') }),
    ).toBeInTheDocument();
    expect(screen.queryByText(t('auth.changeRequiredNotice'))).not.toBeInTheDocument();
  });

  it('lets a normal session open its screens', () => {
    const { router } = renderApp(ROUTE_PATHS.operator.home, { user: buildSessionUser() });

    expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.home);
  });

  it('sends visitors without a session to the login', () => {
    const { router } = renderApp(ROUTE_PATHS.changePassword);

    expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
  });

  it('opens the change screen right after a sign in with a temporary password', async () => {
    server.use(...createSessionBackend(null).handlers);
    const { router } = renderApp(ROUTE_PATHS.login);

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(t('auth.username')), TEST_USERS.newcomer.username);
    await user.type(screen.getByLabelText(t('auth.password')), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: t('auth.signIn') }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.changePassword);
    });
  });

  it('moves to the change screen when any call answers PASSWORD_CHANGE_REQUIRED', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        errorResponse(STATUS.forbidden, 'PASSWORD_CHANGE_REQUIRED'),
      ),
    );
    const { services, router } = renderApp(ROUTE_PATHS.operator.home, {
      user: buildSessionUser(),
    });

    await services.queryClient
      .fetchQuery({ queryKey: ['x'], queryFn: () => services.api.meta.getConstraints() })
      .catch(() => undefined);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.changePassword);
    });
  });

  it('ignores other 403 answers', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () => errorResponse(STATUS.forbidden, 'FORBIDDEN')),
    );
    const { services } = renderApp(ROUTE_PATHS.operator.home, { user: buildSessionUser() });

    await services.queryClient
      .fetchQuery({ queryKey: ['y'], queryFn: () => services.api.meta.getConstraints() })
      .catch(() => undefined);

    expect(services.sessionStore.getSnapshot()).toMatchObject({
      status: 'authenticated',
      user: { mustChangePassword: false },
    });
  });

  it('signs out from the change screen', async () => {
    server.use(...createSessionBackend(TEST_USERS.newcomer).handlers);
    const { services, router } = renderApp(ROUTE_PATHS.changePassword, { user: forced() });

    await userEvent.setup().click(screen.getByRole('button', { name: t('auth.signOut') }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
    });
    expect(services.sessionStore.getSnapshot().status).toBe('anonymous');
  });
});
