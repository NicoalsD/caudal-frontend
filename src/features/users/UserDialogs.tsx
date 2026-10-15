import { useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import { FormSchemaBuilder } from '../../core/forms/FormSchemaBuilder';
import { FIELD, REASON_CONSTRAINT, reasonSchema } from '../../core/forms/formSchemas';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { ROLES } from '../../core/session/roles';
import type { Role } from '../../core/session/roles';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import type { CreatedUserView, ManagedUserView, ResetGrantView } from '../../services/api/views';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { Dialog } from '../../ui/primitives/Dialog';
import { formResolver } from '../../ui/primitives/formResolver';
import { FormFields } from '../../ui/primitives/FormFields';
import { RadioGroupField } from '../../ui/primitives/RadioGroupField';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './Users.module.css';
import { roleText } from './roleText';
import {
  RoleGrantFailedError,
  useChangeRole,
  useCreateUser,
  useIssueResetGrant,
  useUpdateUser,
} from './userQueries';
import { userErrorMessage } from './userErrors';

const USERNAME_FIELD = 'username';
const FULL_NAME_FIELD = 'full_name';
const ROLE_FIELD = 'role';
const PERSON_NAME_CONSTRAINT = 'person_name';
const USERNAME_CONSTRAINT = 'username';

const CREATE_CONFLICT_KEY = 'users.errors.userExists';

interface CreateValues {
  readonly username: string;
  readonly full_name: string;
  readonly role: string;
}

interface CreateOutput {
  readonly username: string;
  readonly full_name: string;
  readonly role: Role;
}

const createFormBuild = (constraints: ConstraintsMap, messages: ValidationMessageFactory) =>
  new FormSchemaBuilder(constraints, messages)
    .text(USERNAME_FIELD, { lowercase: true, constraint: USERNAME_CONSTRAINT })
    .text(FULL_NAME_FIELD, { constraint: PERSON_NAME_CONSTRAINT })
    .requiredChoice(ROLE_FIELD)
    .build();

interface CreateUserDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  /** Called with the new account and its one-time code. The dialog closes right after. */
  readonly onCreated: (created: CreatedUserView) => void;
}

/** Creates an account. The server answers with the activation code, which the screen shows once. */
export function CreateUserDialog(props: CreateUserDialogProps): JSX.Element {
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      trigger={props.trigger}
      title={t('users.createTitle')}
      description={t('users.createDescription')}
    >
      <CreateUserFormGate {...props} />
    </Dialog>
  );
}

function CreateUserFormGate(props: CreateUserDialogProps): JSX.Element {
  const form = useFormSchema(createFormBuild);
  if (form.status === 'loading') {
    return <LoadingState message={t('auth.loadingForm')} />;
  }
  if (form.status !== 'ready') {
    return (
      <ErrorState title={t('users.createTitle')} message={t('connection.constraintsMissing')} />
    );
  }
  return <CreateUserForm {...props} schema={form.schema} />;
}

function CreateUserForm({
  onCreated,
  onOpenChange,
  schema,
}: CreateUserDialogProps & { readonly schema: ReturnType<typeof createFormBuild> }): JSX.Element {
  const create = useCreateUser();
  const aqueductId = useAqueductId();
  const [failure, setFailure] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues, unknown, CreateOutput>({
    resolver: formResolver<CreateValues, CreateOutput>(schema),
    mode: 'onSubmit',
    defaultValues: { username: '', full_name: '', role: '' },
  });
  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      const created = await create.mutateAsync({
        username: values.username,
        fullName: values.full_name,
        aqueductId,
        role: values.role,
      });
      onCreated(created);
      onOpenChange(false);
    } catch (error) {
      setFailure(userErrorMessage(error, t(CREATE_CONFLICT_KEY)));
    }
  });
  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failure === null ? null : <FormAlert message={failure} />}
        <TextField
          label={t('users.usernameLabel')}
          hint={t('users.usernameHint')}
          autoComplete="off"
          error={errors.username?.message}
          {...register(USERNAME_FIELD)}
        />
        <TextField
          label={t('users.fullNameLabel')}
          autoComplete="off"
          error={errors.full_name?.message}
          {...register(FULL_NAME_FIELD)}
        />
        <RadioGroupField
          legend={t('users.roleLegend')}
          options={ROLES.map((role) => ({ value: role, label: roleText(role) }))}
          error={errors.role?.message}
          {...register(ROLE_FIELD)}
        />
        <div className={cn(styles.actions)}>
          <Button type="submit" variant="primary">
            {isSubmitting ? t('users.submittingCreate') : t('users.submitCreate')}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </FormFields>
    </form>
  );
}

interface ChangeRoleDialogProps {
  readonly user: ManagedUserView;
  /** The current membership that ends first, and its role, when the account has one. */
  readonly current: { readonly membershipId: string; readonly role: Role } | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  readonly onDone: () => void;
}

/** Ends the current role and starts the new one. The person must sign in again. */
export function ChangeRoleDialog({
  user,
  current,
  open,
  onOpenChange,
  trigger,
  onDone,
}: ChangeRoleDialogProps): JSX.Element {
  const change = useChangeRole();
  const [failure, setFailure] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<RoleValues>({
    defaultValues: { role: current?.role ?? ROLES[0] },
  });
  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await change.mutateAsync({
        userId: user.id,
        currentMembershipId: current?.membershipId ?? null,
        role: values.role,
      });
      onDone();
      onOpenChange(false);
    } catch (error) {
      setFailure(
        error instanceof RoleGrantFailedError
          ? t('users.errors.roleEndedNotGranted')
          : userErrorMessage(error, t('users.errors.generic')),
      );
    }
  });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t('users.changeRoleTitle')}
      description={t('users.changeRoleDescription', { name: user.fullName })}
    >
      <form onSubmit={(event) => void submit(event)} noValidate>
        <FormFields disabled={change.isPending}>
          {failure === null ? null : <FormAlert message={failure} />}
          <RadioGroupField
            legend={t('users.newRoleLegend')}
            options={ROLES.map((value) => ({ value, label: roleText(value) }))}
            {...register('role')}
          />
          <div className={cn(styles.actions)}>
            <Button type="submit" variant="primary">
              {change.isPending ? t('users.submittingRole') : t('users.submitRole')}
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </FormFields>
      </form>
    </Dialog>
  );
}

interface DeactivateDialogProps {
  readonly user: ManagedUserView;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  readonly onDone: () => void;
}

/** DISABLED is final on the server: the dialog says so before anything is sent. */
export function DeactivateDialog({
  user,
  open,
  onOpenChange,
  trigger,
  onDone,
}: DeactivateDialogProps): JSX.Element {
  const update = useUpdateUser();
  const [failure, setFailure] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t('users.deactivateTitle')}
      description={t('users.deactivateDescription', { name: user.fullName })}
    >
      <FormFields disabled={update.isPending}>
        {failure === null ? null : <FormAlert message={failure} />}
        <div className={cn(styles.actions)}>
          <Button
            variant="primary"
            onClick={() => {
              setFailure(null);
              update
                .mutateAsync({ id: user.id, input: { status: 'DISABLED' } })
                .then(() => {
                  onDone();
                  onOpenChange(false);
                })
                .catch((error: unknown) => {
                  setFailure(userErrorMessage(error, t('users.errors.generic')));
                });
            }}
          >
            {update.isPending ? t('users.submittingDeactivate') : t('users.submitDeactivate')}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </FormFields>
    </Dialog>
  );
}

const resetFormBuild = (constraints: ConstraintsMap, messages: ValidationMessageFactory) => ({
  schema: reasonSchema(constraints, messages),
  reasonMax: constraints[REASON_CONSTRAINT]?.max ?? 0,
});

interface ResetGrantDialogProps {
  readonly user: ManagedUserView;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  /** Called with the one-time code. The screen shows it and drops it when that dialog closes. */
  readonly onIssued: (grant: ResetGrantView) => void;
}

/** Creates the one-time code that lets the person set a new password (API.md 3.4). */
export function ResetGrantDialog(props: ResetGrantDialogProps): JSX.Element {
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      trigger={props.trigger}
      title={t('users.resetTitle')}
      description={t('users.resetDescription', { name: props.user.fullName })}
    >
      <ResetGrantGate {...props} />
    </Dialog>
  );
}

function ResetGrantGate(props: ResetGrantDialogProps): JSX.Element {
  const form = useFormSchema(resetFormBuild);
  if (form.status === 'loading') {
    return <LoadingState message={t('auth.loadingForm')} />;
  }
  if (form.status !== 'ready') {
    return (
      <ErrorState title={t('users.resetTitle')} message={t('connection.constraintsMissing')} />
    );
  }
  return (
    <ResetGrantForm {...props} schema={form.schema.schema} reasonMax={form.schema.reasonMax} />
  );
}

interface RoleValues {
  readonly role: Role;
}

interface ReasonValues {
  readonly change_reason: string;
}

function ResetGrantForm({
  user,
  onIssued,
  onOpenChange,
  schema,
  reasonMax,
}: ResetGrantDialogProps & {
  readonly schema: ReturnType<typeof reasonSchema>;
  readonly reasonMax: number;
}): JSX.Element {
  const issue = useIssueResetGrant();
  const [failure, setFailure] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ReasonValues, unknown, ReasonValues>({
    resolver: formResolver<ReasonValues, ReasonValues>(schema),
    mode: 'onSubmit',
    defaultValues: { change_reason: '' },
  });
  const typedReason = useWatch({ control, name: FIELD.changeReason });
  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      const grant = await issue.mutateAsync({ userId: user.id, reason: values.change_reason });
      onIssued(grant);
      onOpenChange(false);
    } catch (error) {
      setFailure(errorText(error).message);
    }
  });
  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failure === null ? null : <FormAlert message={failure} />}
        <TextAreaField
          label={t('users.reasonLabel')}
          hint={t('users.reasonHint')}
          length={typedReason.length}
          maxLength={reasonMax}
          counterText={(length, max) =>
            t('readings.correction.reasonCounter', { length: String(length), max: String(max) })
          }
          error={errors.change_reason?.message}
          {...register(FIELD.changeReason)}
        />
        <div className={cn(styles.actions)}>
          <Button type="submit" variant="primary">
            {isSubmitting ? t('users.submittingReset') : t('users.submitReset')}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </FormFields>
    </form>
  );
}
