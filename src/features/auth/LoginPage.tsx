import type { JSX } from 'react';
import { Navigate, useSearchParams } from 'react-router';

import { safeNextPath } from '../../core/session/safeNextPath';
import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import { FIELD, loginFormSchema } from '../../core/forms/formSchemas';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { t } from '../../i18n/t';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { useSession } from '../../state/hooks/useSession';
import { useSessionActions } from '../../state/hooks/sessionActionsContext';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { LoginForm } from './LoginForm';
import type { LoginCredentials, LoginLimits } from './LoginForm';
import { cn } from '../../ui/styles/cn';
import styles from './LoginPage.module.css';
import { afterLoginPath } from './afterLoginPath';

const NEXT_PARAM = 'next';

/** Schema and input limits of the form, both from /meta/constraints (stable, built once). */
function buildLoginForm(
  constraints: ConstraintsMap,
  messages: ValidationMessageFactory,
): { schema: ReturnType<typeof loginFormSchema>; limits: LoginLimits } {
  return {
    schema: loginFormSchema(constraints, messages),
    limits: {
      usernameMax: constraints[FIELD.username]?.max,
      passwordMax: constraints[FIELD.password]?.max,
    },
  };
}

/** Screen S01. Signed-in visitors are sent on; the rest see the form once the limits load. */
export function LoginPage(): JSX.Element {
  const session = useSession();
  const actions = useSessionActions();
  const [params] = useSearchParams();
  const form = useFormSchema(buildLoginForm);

  if (session.status === 'restoring') {
    return <LoadingState message={t('auth.restoring')} />;
  }
  if (session.status === 'authenticated') {
    return (
      <Navigate to={afterLoginPath(session.user, safeNextPath(params.get(NEXT_PARAM)))} replace />
    );
  }

  const signIn = async (credentials: LoginCredentials): Promise<void> => {
    await actions.signIn(credentials);
  };

  return (
    <>
      <ScreenTitle>{t('screens.login')}</ScreenTitle>
      <p className={cn(styles.welcome)}>{t('auth.welcome')}</p>
      {session.status === 'expired' ? (
        <p role="status" className={cn(styles.notice)}>
          {t('auth.sessionExpired')}
        </p>
      ) : null}
      {session.status === 'anonymous' && session.reason === 'password-changed' ? (
        <p role="status" className={cn(styles.notice)}>
          {t('auth.passwordChanged')}
        </p>
      ) : null}
      {session.status === 'anonymous' && session.reason === 'offline' ? (
        <p role="status" className={cn(styles.notice)}>
          {t('auth.offlineLogin')}
        </p>
      ) : null}
      {form.status === 'loading' ? <LoadingState message={t('auth.loadingForm')} /> : null}
      {form.status === 'unavailable' ? (
        <ErrorState title={t('screens.login')} message={t('connection.constraintsMissing')} />
      ) : null}
      {form.status === 'misconfigured' ? (
        <ErrorState title={t('screens.login')} message={t('errors.configMissing')} />
      ) : null}
      {form.status === 'ready' ? (
        <div className={cn(styles.formArea)}>
          <LoginForm schema={form.schema.schema} limits={form.schema.limits} onSubmit={signIn} />
        </div>
      ) : null}
      <p className={cn(styles.help)}>{t('auth.forgotPassword')}</p>
    </>
  );
}
