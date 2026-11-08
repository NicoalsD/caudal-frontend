import type { JSX } from 'react';
import { useForm } from 'react-hook-form';

import {
  REGION_FIELD,
  renameFormSchema,
  sectorFormSchema,
  valveFormSchema,
} from '../../core/network/regionForms';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { CheckboxField } from '../../ui/primitives/CheckboxField';
import { FormFields } from '../../ui/primitives/FormFields';
import { formResolver } from '../../ui/primitives/formResolver';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './Regions.module.css';

export interface CodeNameValues {
  readonly code: string;
  readonly name: string;
}

export interface ValveValues extends CodeNameValues {
  readonly is_motorized: boolean;
}

export interface NameValues {
  readonly name: string;
}

interface FormProps<Values> {
  readonly submitLabel: string;
  readonly busyLabel: string;
  readonly error: unknown;
  readonly onSubmit: (values: Values) => Promise<unknown>;
  readonly onCancel: () => void;
  readonly legend: string;
}

function Gate({
  status,
  children,
}: {
  readonly status: 'loading' | 'unavailable' | 'misconfigured' | 'ready';
  readonly children: JSX.Element;
}): JSX.Element {
  if (status === 'loading') {
    return <LoadingState message={t('auth.loadingForm')} />;
  }
  if (status !== 'ready') {
    return <ErrorState title={t('regions.title')} message={t('connection.constraintsMissing')} />;
  }
  return children;
}

/** Code and name of a new region or sector. */
export function SectorForm(props: FormProps<CodeNameValues>): JSX.Element {
  const form = useFormSchema(sectorFormSchema);
  return (
    <Gate status={form.status}>
      {form.status === 'ready' ? <CodeNameForm {...props} schema={form.schema} /> : <></>}
    </Gate>
  );
}

function CodeNameForm({
  schema,
  ...props
}: FormProps<CodeNameValues> & {
  readonly schema: ReturnType<typeof sectorFormSchema>;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CodeNameValues, unknown, CodeNameValues>({
    resolver: formResolver<CodeNameValues, CodeNameValues>(schema),
    defaultValues: { code: '', name: '' },
  });
  const submit = handleSubmit(async (values) => {
    try {
      await props.onSubmit(values);
      reset();
    } catch {
      // The screen shows the error of the mutation.
    }
  });
  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label={props.legend}>
      <FormFields disabled={isSubmitting}>
        {props.error === null ? null : <FormAlert message={errorText(props.error).message} />}
        <TextField
          label={t('regions.codeLabel')}
          hint={t('regions.codeHint')}
          autoComplete="off"
          error={errors.code?.message}
          {...register(REGION_FIELD.code)}
        />
        <TextField
          label={t('regions.nameLabel')}
          autoComplete="off"
          error={errors.name?.message}
          {...register(REGION_FIELD.name)}
        />
        <FormButtons {...props} busy={isSubmitting} />
      </FormFields>
    </form>
  );
}

function FormButtons({
  submitLabel,
  busyLabel,
  busy,
  onCancel,
}: Pick<FormProps<unknown>, 'submitLabel' | 'busyLabel' | 'onCancel'> & {
  readonly busy: boolean;
}): JSX.Element {
  return (
    <div className={cn(styles.actions)}>
      <Button type="submit" variant="primary">
        {busy ? busyLabel : submitLabel}
      </Button>
      <Button onClick={onCancel}>{t('common.cancel')}</Button>
    </div>
  );
}

/** Code, name and motor of a new valve. */
export function ValveForm(props: FormProps<ValveValues>): JSX.Element {
  const form = useFormSchema(valveFormSchema);
  return (
    <Gate status={form.status}>
      {form.status === 'ready' ? <ValveFields {...props} schema={form.schema} /> : <></>}
    </Gate>
  );
}

function ValveFields({
  schema,
  ...props
}: FormProps<ValveValues> & { readonly schema: ReturnType<typeof valveFormSchema> }): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ValveValues, unknown, ValveValues>({
    resolver: formResolver<ValveValues, ValveValues>(schema),
    defaultValues: { code: '', name: '', is_motorized: false },
  });
  const submit = handleSubmit(async (values) => {
    try {
      await props.onSubmit(values);
      reset();
    } catch {
      // The screen shows the error of the mutation.
    }
  });
  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label={props.legend}>
      <FormFields disabled={isSubmitting}>
        {props.error === null ? null : <FormAlert message={errorText(props.error).message} />}
        <TextField
          label={t('regions.valveCodeLabel')}
          hint={t('regions.codeHint')}
          autoComplete="off"
          error={errors.code?.message}
          {...register(REGION_FIELD.code)}
        />
        <TextField
          label={t('regions.valveNameLabel')}
          autoComplete="off"
          error={errors.name?.message}
          {...register(REGION_FIELD.name)}
        />
        <CheckboxField
          label={t('regions.motorizedLabel')}
          {...register(REGION_FIELD.isMotorized)}
        />
        <FormButtons {...props} busy={isSubmitting} />
      </FormFields>
    </form>
  );
}

/** The new name of a sector. */
export function RenameForm({
  initialName,
  ...props
}: FormProps<NameValues> & { readonly initialName: string }): JSX.Element {
  const form = useFormSchema(renameFormSchema);
  return (
    <Gate status={form.status}>
      {form.status === 'ready' ? (
        <RenameFields {...props} initialName={initialName} schema={form.schema} />
      ) : (
        <></>
      )}
    </Gate>
  );
}

function RenameFields({
  schema,
  initialName,
  ...props
}: FormProps<NameValues> & {
  readonly schema: ReturnType<typeof renameFormSchema>;
  readonly initialName: string;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NameValues, unknown, NameValues>({
    resolver: formResolver<NameValues, NameValues>(schema),
    defaultValues: { name: initialName },
  });
  const submit = handleSubmit(async (values) => {
    try {
      await props.onSubmit(values);
    } catch {
      // The screen shows the error of the mutation.
    }
  });
  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label={props.legend}>
      <FormFields disabled={isSubmitting}>
        {props.error === null ? null : <FormAlert message={errorText(props.error).message} />}
        <TextField
          label={t('regions.nameLabel')}
          autoComplete="off"
          error={errors.name?.message}
          {...register(REGION_FIELD.name)}
        />
        <FormButtons {...props} busy={isSubmitting} />
      </FormFields>
    </form>
  );
}
