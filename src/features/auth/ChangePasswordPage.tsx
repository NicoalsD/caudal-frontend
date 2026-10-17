import { useCallback } from 'react';
import type { JSX } from 'react';
import { Navigate } from 'react-router';

import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import { changePasswordFormSchema, PASSWORD_CONSTRAINT } from '../../core/forms/formSchemas';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { useSession } from '../../state/hooks/useSession';
import { useSessionActions } from '../../state/hooks/sessionActionsContext';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { ChangePasswordForm } from './ChangePasswordForm';
import { SignOutButton } from './SignOutButton';

/**
 * Screen S02. While the server demands a change (first sign in, or after a reset) it explains
 * why nothing else opens and offers to sign out. The form itself is `ChangePasswordForm`.
 */
export function ChangePasswordPage(): JSX.Element {
  const session = useSession();
  const actions = useSessionActions();
  const username = session.status === 'authenticated' ? session.user.username : '';
  const build = useCallback(
    (constraints: ConstraintsMap, messages: ValidationMessageFactory) => ({
      schema: changePasswordFormSchema(constraints, messages, username),
      limits: {
        min: constraints[PASSWORD_CONSTRAINT]?.min ?? 0,
        max: constraints[PASSWORD_CONSTRAINT]?.max ?? 0,
      },
    }),
    [username],
  );
  const form = useFormSchema(build);

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
      {form.status === 'loading' ? <LoadingState message={t('auth.loadingForm')} /> : null}
      {form.status === 'unavailable' ? (
        <ErrorState
          title={t('screens.changePassword')}
          message={t('connection.constraintsMissing')}
        />
      ) : null}
      {form.status === 'misconfigured' ? (
        <ErrorState title={t('screens.changePassword')} message={t('errors.configMissing')} />
      ) : null}
      {form.status === 'ready' ? (
        <ChangePasswordForm
          schema={form.schema.schema}
          limits={form.schema.limits}
          username={session.user.username}
          onSubmit={(change) => actions.changePassword(change)}
        />
      ) : null}
      <SignOutButton />
    </>
  );
}
