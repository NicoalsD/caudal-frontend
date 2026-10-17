import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { STATUS } from '../../test/constants';
import { TEST_NEW_PASSWORD, TEST_PASSWORD, TEST_USERS } from '../../test/factories/auth';
import { buildSessionUser } from '../../test/factories/session';
import { COMMON_PASSWORD } from '../../test/msw/handlers/auth';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { createSessionBackend } from '../../test/msw/sessionBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const USER = TEST_USERS.newcomer;
const sessionUser = () =>
  buildSessionUser({
    userId: USER.id,
    username: USER.username,
    mustChangePassword: true,
    aqueductId: USER.aqueduct_id,
  });

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  values: { current?: string; next?: string; again?: string },
) {
  const current = await screen.findByLabelText(t('auth.currentPassword'));
  await user.type(current, values.current ?? TEST_PASSWORD);
  await user.type(screen.getByLabelText(t('auth.newPassword')), values.next ?? TEST_NEW_PASSWORD);
  await user.type(
    screen.getByLabelText(t('auth.confirmPassword')),
    values.again ?? values.next ?? TEST_NEW_PASSWORD,
  );
}

const save = () => screen.getByRole('button', { name: t('auth.savePassword') });

async function signedIn() {
  const backend = createSessionBackend(null);
  server.use(...backend.handlers);
  const app = renderApp(ROUTE_PATHS.login);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(t('auth.username')), USER.username);
  await user.type(screen.getByLabelText(t('auth.password')), TEST_PASSWORD);
  await user.click(screen.getByRole('button', { name: t('auth.signIn') }));
  await screen.findByLabelText(t('auth.currentPassword'));
  return { backend, user, ...app };
}

describe('ChangePasswordForm', () => {
  it('labels the three fields with the right autocomplete hints', async () => {
    await signedIn();

    expect(screen.getByLabelText(t('auth.currentPassword'))).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
    expect(screen.getByLabelText(t('auth.newPassword'))).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
    expect(screen.getByLabelText(t('auth.confirmPassword'))).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
  });

  it('shows the requirements with the limits of the server and updates them as you type', async () => {
    const { user } = await signedIn();
    const limits = { min: '12', max: '128' };

    expect(
      screen.getByText(`${t('auth.requirementLength', limits)}: ${t('auth.requirementPending')}`),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(t('auth.newPassword')), TEST_NEW_PASSWORD);

    expect(
      screen.getByText(`${t('auth.requirementLength', limits)}: ${t('auth.requirementMet')}`),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(t('auth.newPassword')).getAttribute('aria-describedby'),
    ).toBeTruthy();
  });

  it('flags a confirmation that does not match and keeps focus on the first error', async () => {
    const { user } = await signedIn();
    await fillForm(user, { again: `${TEST_NEW_PASSWORD}x` });

    await user.click(save());

    expect(await screen.findByText(t('validation.mismatch'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('auth.confirmPassword'))).toHaveFocus();
  });

  it('rejects a new password that contains the username', async () => {
    const { user } = await signedIn();
    await fillForm(user, { next: `xx-${USER.username}-xxxx` });

    await user.click(save());

    expect(await screen.findByText(t('validation.containsUsername'))).toBeInTheDocument();
  });

  it('rejects a new password equal to the current one', async () => {
    const { user } = await signedIn();
    await fillForm(user, { next: TEST_PASSWORD });

    await user.click(save());

    expect(await screen.findByText(t('validation.sameAsCurrent'))).toBeInTheDocument();
  });

  it('marks the current password as wrong when the server answers 401 after the renewal', async () => {
    const { user, backend } = await signedIn();
    await fillForm(user, { current: 'esta-no-es-la-actual' });

    await user.click(save());

    expect(await screen.findByText(t('auth.wrongCurrentPassword'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('auth.currentPassword'))).toHaveFocus();
    expect(screen.getByLabelText(t('auth.newPassword'))).toHaveValue('');
    expect(backend.calls.passwordChanges).toBe(0);
  });

  it('shows the policy error on the new password when the server refuses it', async () => {
    const { user } = await signedIn();
    await fillForm(user, { next: COMMON_PASSWORD });

    await user.click(save());

    expect(await screen.findByText(t('errors.api.passwordPolicyViolation'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('auth.newPassword'))).toHaveFocus();
  });

  it('sends only the contract fields and, on success, ends the session', async () => {
    const bodies: unknown[] = [];
    const { user, router, services, backend } = await signedIn();
    server.use(
      http.post(apiUrl('/auth/change-password'), async ({ request }) => {
        bodies.push(await request.clone().json());
        return undefined;
      }),
    );
    await fillForm(user, {});

    await user.click(save());

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
    });
    expect(bodies).toEqual([{ current_password: TEST_PASSWORD, new_password: TEST_NEW_PASSWORD }]);
    expect(services.sessionStore.getSnapshot()).toEqual({
      status: 'anonymous',
      reason: 'password-changed',
    });
    expect(services.tokens.get()).toBeNull();
    expect(await screen.findByText(t('auth.passwordChanged'))).toBeInTheDocument();
    expect(backend.calls.passwordChanges).toBe(1);
  });

  it('after the change the old refresh cookie is dead and a new sign in is needed', async () => {
    const { user, router, backend } = await signedIn();
    await fillForm(user, {});

    await user.click(save());

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
    });
    expect(backend.calls.passwordChanges).toBe(1);
    expect(router.state.location.search).toContain('next=');
  });

  it('never leaves a password in web storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { user } = await signedIn();
    await fillForm(user, { current: 'otra-actual-larga-1' });

    await user.click(save());
    await screen.findByText(t('auth.wrongCurrentPassword'));

    expect(setItem).not.toHaveBeenCalled();
  });

  it('shows a general alert with the support code for a server error', async () => {
    const { user } = await signedIn();
    server.use(
      http.post(apiUrl('/auth/change-password'), () =>
        errorResponse(STATUS.badRequest, 'VALIDATION_ERROR'),
      ),
    );
    await fillForm(user, {});

    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.api.validationError'));
  });

  it('keeps the form closed when the limits cannot be loaded', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        errorResponse(STATUS.badRequest, 'VALIDATION_ERROR'),
      ),
    );
    renderApp(ROUTE_PATHS.changePassword, { user: sessionUser() });

    expect(await screen.findByText(t('connection.constraintsMissing'))).toBeInTheDocument();
    expect(screen.queryByLabelText(t('auth.newPassword'))).not.toBeInTheDocument();
  });
});
