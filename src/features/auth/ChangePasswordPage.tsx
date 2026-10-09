import type { JSX } from 'react';
import { Navigate } from 'react-router';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { useSession } from '../../state/hooks/useSession';
import { useSessionActions } from '../../state/hooks/sessionActionsContext';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';

/**
 * Screen S02. While the server demands a change (first sign in, or after a reset) it explains
 * why nothing else opens and offers to sign out. The form itself is `ChangePasswordForm`.
 */
export function ChangePasswordPage(): JSX.Element {
  const session = useSession();
  const actions = useSessionActions();

  if (session.status !== 'authenticated') {
    return <Navigate to={ROUTE_PATHS.login} replace />;
  }
  const mandatory = session.user.mustChangePassword;

  return (
    <>
      <ScreenTitle>
        {mandatory ? t('auth.changeRequiredTitle') : t('screens.changePassword')}
      </ScreenTitle>
      {mandatory ? <p role="status">{t('auth.changeRequiredNotice')}</p> : null}
      <Button
        onClick={() => {
          void actions.logout();
        }}
      >
        {t('auth.signOut')}
      </Button>
    </>
  );
}
