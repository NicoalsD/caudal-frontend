import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { PasswordField } from './PasswordField';

const LABEL = t('auth.password');
const ERROR_TEXT = t('validation.required');
const DESCRIPTION_ID = 'requirements-list';

function renderField(props: Partial<ComponentProps<typeof PasswordField>> = {}) {
  render(<PasswordField label={LABEL} {...props} />);
  return userEvent.setup();
}

const input = () => screen.getByLabelText(LABEL);
const toggle = (name: string) => screen.getByRole('button', { name });

describe('PasswordField', () => {
  it('links the label to the input and hides the password by default', () => {
    renderField();

    expect(input()).toHaveAttribute('type', 'password');
    expect(input()).toHaveAttribute('autocapitalize', 'none');
  });

  it('shows the password when the show button is pressed', async () => {
    const user = renderField();

    await user.click(toggle(t('auth.showPassword')));

    expect(input()).toHaveAttribute('type', 'text');
    const hideButton = toggle(t('auth.hidePassword'));
    expect(hideButton).toHaveAttribute('aria-pressed', 'true');
    expect(hideButton).toHaveAttribute('aria-controls', input().id);
  });

  it('hides the password again when the hide button is pressed', async () => {
    const user = renderField();

    await user.click(toggle(t('auth.showPassword')));
    await user.click(toggle(t('auth.hidePassword')));

    expect(input()).toHaveAttribute('type', 'password');
    expect(toggle(t('auth.showPassword'))).toHaveAttribute('aria-pressed', 'false');
  });

  it('warns about caps lock and describes the input with that warning', () => {
    renderField();
    const field = input();

    fireEvent.keyUp(field, { key: 'A', modifierCapsLock: true });

    const warning = screen.getByText(t('auth.capsLockOn'));
    expect(field.getAttribute('aria-describedby')).toContain(warning.id);
  });

  it('removes the caps lock warning when the input loses focus', () => {
    renderField();
    const field = input();

    fireEvent.keyUp(field, { key: 'A', modifierCapsLock: true });
    expect(screen.getByText(t('auth.capsLockOn'))).toBeInTheDocument();

    fireEvent.blur(field);

    expect(screen.queryByText(t('auth.capsLockOn'))).not.toBeInTheDocument();
  });

  it('shows the error as an alert and links it to the input', () => {
    renderField({ error: ERROR_TEXT });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(ERROR_TEXT);
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input().getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('keeps the external description next to the error link', () => {
    renderField({ describedBy: DESCRIPTION_ID, error: ERROR_TEXT });

    const describedBy = input().getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toContain(DESCRIPTION_ID);
  });
});
