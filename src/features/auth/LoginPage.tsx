import { useEffect } from 'react';
import type { JSX } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';

import { safeNextPath } from '../../core/session/safeNextPath';
import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import { FIELD, loginFormSchema } from '../../core/forms/formSchemas';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import type { PublicInstitutionView } from '../../services/api/views';
import { t } from '../../i18n/t';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import type { FormSchemaState } from '../../state/hooks/useFormSchema';
import { useSession } from '../../state/hooks/useSession';
import { useSessionActions } from '../../state/hooks/sessionActionsContext';
import { Button } from '../../ui/primitives/Button';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { LoginForm } from './LoginForm';
import type { LoginCredentials, LoginLimits } from './LoginForm';
import { cn } from '../../ui/styles/cn';
import styles from './LoginPage.module.css';
import { afterLoginPath } from './afterLoginPath';
import { InstitutionPicker } from './InstitutionPicker';
import { chooseInstitutionPath, isUnknownInstitutionState } from './loginPaths';
import { useRememberedInstitution } from '../../state/hooks/useRememberedInstitution';
import { useInstitutionDirectory } from './institutionQueries';

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

/**
 * Sign-in screens. `/login` is the first step (choose the institution); `/i/{slug}/login` is the
 * second (credentials). Signed-in visitors are sent on; the rest see the step they asked for.
 */
export function LoginPage(): JSX.Element {
  const session = useSession();
  const actions = useSessionActions();
  const [params] = useSearchParams();
  const { institutionSlug } = useParams();
  const location = useLocation();
  const form = useFormSchema(buildLoginForm);

  if (session.status === 'restoring') {
    return <LoadingState message={t('auth.restoring')} />;
  }
  if (session.status === 'authenticated') {
    return (
      <Navigate to={afterLoginPath(session.user, safeNextPath(params.get(NEXT_PARAM)))} replace />
    );
  }

  const notices = (
    <>
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
    </>
  );

  if (institutionSlug === undefined) {
    const unknown = isUnknownInstitutionState(location.state)
      ? location.state.unknownInstitutionSlug
      : null;
    return (
      <>
        {notices}
        <InstitutionPicker unknownSlug={unknown} />
      </>
    );
  }

  const signIn = async (credentials: LoginCredentials): Promise<void> => {
    await actions.signIn({ ...credentials, institutionSlug });
  };

  return (
    <>
      {notices}
      <InstitutionCredentials
        slug={institutionSlug}
        nextPath={params.get(NEXT_PARAM)}
        form={form}
        onSignIn={signIn}
      />
    </>
  );
}

interface InstitutionCredentialsProps {
  readonly slug: string;
  readonly nextPath: string | null;
  readonly form: FormSchemaState<ReturnType<typeof buildLoginForm>>;
  readonly onSignIn: (credentials: LoginCredentials) => Promise<void>;
}

/**
 * Second step: the name of the chosen institution and the credentials. An unknown slug goes back to
 * the first step with a notice; a failed directory shows a retry, never the notice.
 */
function InstitutionCredentials({
  slug,
  nextPath,
  form,
  onSignIn,
}: InstitutionCredentialsProps): JSX.Element {
  const directory = useInstitutionDirectory();
  const navigate = useNavigate();
  const [, remember] = useRememberedInstitution();
  const institution = directory.data?.find((item) => item.slug === slug);
  const known = institution !== undefined;

  useEffect(() => {
    if (known) {
      remember(slug);
    }
  }, [known, slug, remember]);

  if (directory.isPending) {
    return <LoadingState message={t('auth.institution.loading')} />;
  }
  if (directory.isError) {
    return (
      <>
        <ScreenTitle>{t('screens.login')}</ScreenTitle>
        <FormAlert message={t('auth.institution.loadError')} />
        <Button
          variant="secondary"
          className={cn(styles.retryButton)}
          onClick={() => {
            void directory.refetch();
          }}
        >
          {t('auth.institution.retry')}
        </Button>
      </>
    );
  }
  if (institution === undefined) {
    return (
      <Navigate
        to={chooseInstitutionPath(nextPath)}
        replace
        state={{ unknownInstitutionSlug: slug }}
      />
    );
  }
  return (
    <>
      <ScreenTitle>{t('screens.login')}</ScreenTitle>
      <InstitutionBar
        institution={institution}
        onChange={() => {
          void navigate(chooseInstitutionPath(nextPath));
        }}
      />
      <p className={cn(styles.welcome)}>{t('auth.welcome')}</p>
      <CredentialsArea form={form} onSignIn={onSignIn} />
      <p className={cn(styles.help)}>{t('auth.forgotPassword')}</p>
    </>
  );
}

interface InstitutionBarProps {
  readonly institution: PublicInstitutionView;
  readonly onChange: () => void;
}

function InstitutionBar({ institution, onChange }: InstitutionBarProps): JSX.Element {
  return (
    <div className={cn(styles.institutionBar)}>
      <p>
        <span className={cn(styles.institutionLabel)}>{t('auth.institution.signingInto')}</span>{' '}
        <strong>{institution.name}</strong>
      </p>
      <Button variant="secondary" onClick={onChange}>
        {t('auth.institution.change')}
      </Button>
    </div>
  );
}

interface CredentialsAreaProps {
  readonly form: InstitutionCredentialsProps['form'];
  readonly onSignIn: (credentials: LoginCredentials) => Promise<void>;
}

function CredentialsArea({ form, onSignIn }: CredentialsAreaProps): JSX.Element {
  return (
    <>
      {form.status === 'loading' ? <LoadingState message={t('auth.loadingForm')} /> : null}
      {form.status === 'unavailable' ? (
        <ErrorState title={t('screens.login')} message={t('connection.constraintsMissing')} />
      ) : null}
      {form.status === 'misconfigured' ? (
        <ErrorState title={t('screens.login')} message={t('errors.configMissing')} />
      ) : null}
      {form.status === 'ready' ? (
        <div className={cn(styles.formArea)}>
          <LoginForm schema={form.schema.schema} limits={form.schema.limits} onSubmit={onSignIn} />
        </div>
      ) : null}
    </>
  );
}
