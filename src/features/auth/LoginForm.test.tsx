import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DomainError } from '../../core/errors/DomainError';
import { NetworkError } from '../../core/errors/NetworkError';
import type { FieldConstraint } from '../../core/forms/FieldConstraint';
import { loginFormSchema } from '../../core/forms/formSchemas';
import { validationMessages } from '../../i18n/validationMessages';
import { t } from '../../i18n/t';
import { ApiDtoAdapter } from '../../services/api/adapters/ApiDtoAdapter';
import { buildConstraints } from '../../test/factories/constraints';
import { LoginForm } from './LoginForm';
import type { LoginCredentials } from './LoginForm';

const PASSWORD = 'contraseña larga de prueba';
const STRICT_MIN = 20;
const USERNAME_MAX = buildConstraints().username?.max;
const PASSWORD_MAX = buildConstraints().password?.max;
const RETRY_SECONDS = 600;
const EXPECTED_MINUTES = '10';

function renderForm(
  onSubmit: (credentials: LoginCredentials) => Promise<void> = () => Promise.resolve(),
  minPassword?: number,
) {
  const constraints: Record<string, FieldConstraint> = {
    ...new ApiDtoAdapter().toConstraints(buildConstraints()),
  };
  if (minPassword !== undefined) {
    constraints.password = { ...constraints.password, min: minPassword };
  }
  const schema = loginFormSchema(constraints, validationMessages);
  const limits = {
    usernameMax: constraints.username?.max,
    passwordMax: constraints.password?.max,
  };
  render(<LoginForm schema={schema} limits={limits} onSubmit={onSubmit} />);
  return userEvent.setup();
}

const usernameField = () => screen.getByLabelText(t('auth.username'));
const passwordField = () => screen.getByLabelText(t('auth.password'));
const submitButton = () => screen.getByRole('button', { name: t('auth.signIn') });

describe('LoginForm', () => {
  it('offers labeled fields with the right autocomplete hints', () => {
    renderForm();

    expect(usernameField()).toHaveAttribute('autocomplete', 'username');
    expect(passwordField()).toHaveAttribute('type', 'password');
    expect(passwordField()).toHaveAttribute('autocomplete', 'current-password');
  });

  it('announces errors, links them to the field and focuses the first one', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    const user = renderForm(onSubmit);

    await user.click(submitButton());

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map((alert) => alert.textContent)).toEqual([
      t('validation.required'),
      t('validation.required'),
    ]);
    expect(usernameField()).toHaveFocus();
    expect(usernameField()).toHaveAttribute('aria-invalid', 'true');
    expect(usernameField().getAttribute('aria-describedby')).toBe(alerts[0]?.id);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('takes the limits from the server constraints, not from the code', async () => {
    const user = renderForm(undefined, STRICT_MIN);

    await user.type(usernameField(), 'junta.uno');
    await user.type(passwordField(), PASSWORD.slice(0, STRICT_MIN - 1));
    await user.click(submitButton());

    expect(await screen.findByText(t('validation.min', { min: STRICT_MIN }))).toBeInTheDocument();
  });

  it('sends the username in lower case and the password exactly as typed', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    const user = renderForm(onSubmit);

    await user.type(usernameField(), '  Junta.Uno ');
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ username: 'junta.uno', password: PASSWORD });
    });
  });

  it('leaves the fields as they are on success, so a password manager can offer to save them', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    const user = renderForm(onSubmit);

    await user.type(usernameField(), 'junta.uno');
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(passwordField()).toHaveValue(PASSWORD);
  });

  it('shows the generic text for any 401, clears and focuses the password', async () => {
    const failure = Object.assign(new DomainError('INVALID_CREDENTIALS', 'x'), { status: 401 });
    const user = renderForm(() => Promise.reject(failure));

    await user.type(usernameField(), 'junta.uno');
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.api.invalidCredentials'));
    expect(passwordField()).toHaveValue('');
    await waitFor(() => {
      expect(passwordField()).toHaveFocus();
    });
    expect(usernameField()).toHaveValue('junta.uno');
  });

  it('tells how many minutes to wait after a 429', async () => {
    const failure = Object.assign(new DomainError('RATE_LIMITED', 'x'), {
      status: 429,
      retryAfterSeconds: RETRY_SECONDS,
    });
    const user = renderForm(() => Promise.reject(failure));

    await user.type(usernameField(), 'junta.uno');
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      t('auth.tooManyAttempts', { minutes: EXPECTED_MINUTES }),
    );
  });

  it('explains that a connection is needed when offline', async () => {
    const user = renderForm(() => Promise.reject(new NetworkError()));

    await user.type(usernameField(), 'junta.uno');
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(t('auth.offlineLogin'));
  });

  it('disables the fields and says "Entrando..." while sending', async () => {
    let finish: () => void = () => undefined;
    const user = renderForm(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    await user.type(usernameField(), 'junta.uno');
    await user.type(passwordField(), PASSWORD);
    await user.click(submitButton());

    const busy = await screen.findByRole('button', { name: t('auth.signingIn') });
    expect(busy).toBeDisabled();
    expect(usernameField()).toBeDisabled();
    finish();
    await waitFor(() => {
      expect(usernameField()).toBeEnabled();
    });
  });

  it('stops typing at the server limits for username and password', () => {
    renderForm();

    expect(usernameField()).toHaveAttribute('maxlength', String(USERNAME_MAX));
    expect(passwordField()).toHaveAttribute('maxlength', String(PASSWORD_MAX));
  });

  it('hides the password again after a failed sign in, even if it was shown', async () => {
    const failure = Object.assign(new DomainError('INVALID_CREDENTIALS', 'x'), { status: 401 });
    const user = renderForm(() => Promise.reject(failure));

    await user.type(usernameField(), 'junta.uno');
    await user.type(passwordField(), PASSWORD);
    await user.click(screen.getByRole('button', { name: t('auth.showPassword') }));
    expect(passwordField()).toHaveAttribute('type', 'text');

    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.api.invalidCredentials'));
    expect(passwordField()).toHaveAttribute('type', 'password');
    expect(passwordField()).toHaveValue('');
  });
});
