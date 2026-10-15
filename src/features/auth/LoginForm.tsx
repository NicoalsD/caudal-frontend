import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';

import type { loginFormSchema } from '../../core/forms/formSchemas';
import { FIELD } from '../../core/forms/formSchemas';
import { t } from '../../i18n/t';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { FormFields } from '../../ui/primitives/FormFields';
import { formResolver } from '../../ui/primitives/formResolver';
import { TextField } from '../../ui/primitives/TextField';
import { loginErrorMessage } from './loginErrors';

export interface LoginCredentials {
  readonly username: string;
  readonly password: string;
}

interface LoginFormProps {
  readonly schema: ReturnType<typeof loginFormSchema>;
  /** Rejects when the sign in fails; the form shows the generic text and clears the password. */
  readonly onSubmit: (credentials: LoginCredentials) => Promise<void>;
}

/**
 * Sign-in form (screen S01). The limits come from /meta/constraints through `schema`. The password
 * is never kept: it is cleared after every attempt that reached the server.
 */
export function LoginForm({ schema, onSubmit }: LoginFormProps): JSX.Element {
  const [failure, setFailure] = useState<string | null>(null);
  const { register, handleSubmit, setFocus, resetField, formState } = useForm<
    LoginCredentials,
    unknown,
    LoginCredentials
  >({
    resolver: formResolver<LoginCredentials>(schema),
    mode: 'onBlur',
    defaultValues: { username: '', password: '' },
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    if (failure !== null && !isSubmitting) {
      setFocus(FIELD.password);
    }
  }, [failure, isSubmitting, setFocus]);

  const submit = handleSubmit(async (credentials) => {
    setFailure(null);
    try {
      await onSubmit(credentials);
    } catch (error) {
      setFailure(loginErrorMessage(error));
    } finally {
      resetField(FIELD.password, { defaultValue: '' });
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failure === null ? null : <FormAlert message={failure} />}
        <TextField
          label={t('auth.username')}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.username?.message}
          {...register(FIELD.username)}
        />
        <TextField
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register(FIELD.password)}
        />
        <Button type="submit" variant="primary">
          {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </FormFields>
    </form>
  );
}
