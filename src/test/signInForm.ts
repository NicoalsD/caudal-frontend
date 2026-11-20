import { screen, waitFor } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

import { t } from '../i18n/t';

type User = ReturnType<typeof userEvent.setup>;

/**
 * Walks the two-step sign in the way a person does. If the first step (choose the institution) is
 * showing, its only institution is confirmed; then the credentials are typed and sent. It works
 * from /login and from /i/{slug}/login, so a test does not need to know which step it lands on.
 */
export async function signInThroughSteps(
  user: User,
  username: string,
  password: string,
): Promise<void> {
  await waitFor(() => {
    const onCredentials = screen.queryByLabelText(t('auth.username')) !== null;
    const onChoice =
      screen.queryByRole('button', { name: t('auth.institution.continue') }) !== null;
    if (!onCredentials && !onChoice) {
      throw new Error('The sign in step did not show');
    }
  });
  if (screen.queryByLabelText(t('auth.username')) === null) {
    await user.click(screen.getByRole('button', { name: t('auth.institution.continue') }));
  }
  await user.type(await screen.findByLabelText(t('auth.username')), username);
  await user.type(screen.getByLabelText(t('auth.password')), password);
  await user.click(screen.getByRole('button', { name: t('auth.signIn') }));
}
