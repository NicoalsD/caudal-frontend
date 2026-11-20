import { useEffect, useId, useState } from 'react';
import type { JSX } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { changePasswordFormSchema } from '../../core/forms/formSchemas';
import { FIELD } from '../../core/forms/formSchemas';
import { passwordRequirements } from '../../core/forms/passwordRequirements';
import { t } from '../../i18n/t';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { formResolver } from '../../ui/primitives/formResolver';
import { FormFields } from '../../ui/primitives/FormFields';
import { TextField } from '../../ui/primitives/TextField';
import { PasswordRequirements } from './PasswordRequirements';
import { passwordFailure } from './passwordErrors';
import type { PasswordFailure } from './passwordErrors';

export interface PasswordChange {
  readonly current_password: string;
  readonly new_password: string;
  readonly confirm_password: string;
}

interface ChangePasswordFormProps {
  readonly schema: ReturnType<typeof changePasswordFormSchema>;
  readonly username: string;
  /** Length range of the new password, from /meta/constraints. */
  readonly limits: { readonly min: number; readonly max: number };
  /** Rejects with the API error when the server refuses the change. */
  readonly onSubmit: (change: { currentPassword: string; newPassword: string }) => Promise<void>;
}

/**
 * Change-password form (screen S02). Every password field is cleared after an attempt that
 * reached the server; the checklist is computed in the browser and the server decides for real.
 */
export function ChangePasswordForm({
  schema,
  username,
  limits,
  onSubmit,
}: ChangePasswordFormProps): JSX.Element {
  const requirementsId = useId();
  const [formFailure, setFormFailure] = useState<PasswordFailure | null>(null);
  const { register, handleSubmit, setError, setFocus, resetField, control, formState } = useForm<
    PasswordChange,
    unknown,
    PasswordChange
  >({
    resolver: formResolver<PasswordChange>(schema),
    mode: 'onBlur',
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });
  const { errors, isSubmitting, submitCount } = formState;
  const newPassword = useWatch({ control, name: FIELD.newPassword });
  const currentPassword = useWatch({ control, name: FIELD.currentPassword });
  const checklist = passwordRequirements({
    value: newPassword,
    current: currentPassword,
    username,
    ...limits,
  });

  useEffect(() => {
    if (formFailure?.field != null && !isSubmitting) {
      setError(formFailure.field, { type: 'server', message: formFailure.message });
      setFocus(formFailure.field);
    }
  }, [formFailure, isSubmitting, setError, setFocus, submitCount]);

  const submit = handleSubmit(async (values) => {
    setFormFailure(null);
    try {
      await onSubmit({
        currentPassword: values.current_password,
        newPassword: values.new_password,
      });
    } catch (error) {
      setFormFailure(passwordFailure(error));
    } finally {
      resetField(FIELD.currentPassword, { defaultValue: '' });
      resetField(FIELD.newPassword, { defaultValue: '' });
      resetField(FIELD.confirmPassword, { defaultValue: '' });
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {formFailure !== null && formFailure.field === null ? (
          <FormAlert message={formFailure.message} detail={formFailure.supportCode} />
        ) : null}
        <TextField
          label={t('auth.currentPassword')}
          type="password"
          autoComplete="current-password"
          error={errors.current_password?.message}
          {...register(FIELD.currentPassword)}
        />
        <TextField
          label={t('auth.newPassword')}
          type="password"
          autoComplete="new-password"
          describedBy={requirementsId}
          error={errors.new_password?.message}
          {...register(FIELD.newPassword)}
        />
        <PasswordRequirements
          id={requirementsId}
          requirements={checklist}
          min={limits.min}
          max={limits.max}
        />
        <TextField
          label={t('auth.confirmPassword')}
          type="password"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          {...register(FIELD.confirmPassword)}
        />
        <Button type="submit" variant="primary">
          {isSubmitting ? t('auth.savingPassword') : t('auth.savePassword')}
        </Button>
      </FormFields>
    </form>
  );
}
