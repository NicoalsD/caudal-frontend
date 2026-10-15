import type { JSX } from 'react';
import { Navigate, useSearchParams } from 'react-router';

import { safeNextPath } from '../../core/session/safeNextPath';
import { loginFormSchema } from '../../core/forms/formSchemas';
import { t } from '../../i18n/t';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { useSession } from '../../state/hooks/useSession';
import { useSessionActions } from '../../state/hooks/sessionActionsContext';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { LoginForm } from './LoginForm';
import type { LoginCredentials } from './LoginForm';
import { afterLoginPath } from './afterLoginPath';

const NEXT_PARAM = 'next';

/** Screen S01. Signed-in visitors are sent on; the rest see the form once the limits load. */
export function LoginPage(): JSX.Element {
  const session = useSession();
  const actions = useSessionActions();
  const [params] = useSearchParams();
  const schema = useFormSchema(loginFormSchema);

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
      <p>{t('auth.tagline')}</p>
      {session.status === 'expired' ? <p role="status">{t('auth.sessionExpired')}</p> : null}
      {session.status === 'anonymous' && session.reason === 'password-changed' ? (
        <p role="status">{t('auth.passwordChanged')}</p>
      ) : null}
      {session.status === 'anonymous' && session.reason === 'offline' ? (
        <p role="status">{t('auth.offlineLogin')}</p>
      ) : null}
      {schema.status === 'loading' ? <LoadingState message={t('auth.loadingForm')} /> : null}
      {schema.status === 'unavailable' ? (
        <ErrorState title={t('screens.login')} message={t('connection.constraintsMissing')} />
      ) : null}
      {schema.status === 'misconfigured' ? (
        <ErrorState title={t('screens.login')} message={t('errors.configMissing')} />
      ) : null}
      {schema.status === 'ready' ? <LoginForm schema={schema.schema} onSubmit={signIn} /> : null}
    </>
  );
}
