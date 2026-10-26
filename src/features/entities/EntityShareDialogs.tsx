import { useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import { FormSchemaBuilder } from '../../core/forms/FormSchemaBuilder';
import { FIELD, REASON_CONSTRAINT } from '../../core/forms/formSchemas';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { bogotaLocalToIso } from '../../core/summaries/bogotaExpiry';
import { currentRoleByUser } from '../../core/users/accountRoles';
import type { AccountRole } from '../../core/users/accountRoles';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import type { CreateSummaryShareInput } from '../../services/api/endpoints/SummariesApi';
import type {
  ManagedMembershipView,
  ManagedUserView,
  SummaryScope,
} from '../../services/api/views';
import { useFormSchema } from '../../state/hooks/useFormSchema';
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
import { useAllMemberships, useAllUsers } from '../users/userQueries';
import styles from './Entities.module.css';
import { summaryScopeText } from './summaryScope';
import { useCreateSummaryShare, useRevokeSummaryShare } from './entityQueries';

const SCOPES: readonly SummaryScope[] = ['MONTHLY_SUMMARY', 'MINUTES'];
const SUPPORT_ENTITY = 'SUPPORT_ENTITY';

const FIELDS = {
  grantee: 'grantee_user_id',
  scope: 'scope',
  periodFrom: 'period_from',
  periodTo: 'period_to',
  expiresAt: 'expires_at',
} as const;

const createFormBuild = (constraints: ConstraintsMap, messages: ValidationMessageFactory) => ({
  schema: new FormSchemaBuilder(constraints, messages)
    .requiredChoice(FIELDS.grantee)
    .requiredChoice(FIELDS.scope)
    .requiredChoice(FIELDS.periodFrom)
    .requiredChoice(FIELDS.periodTo)
    .requiredChoice(FIELDS.expiresAt)
    .requiredReason(FIELD.changeReason, { constraint: REASON_CONSTRAINT })
    .build(),
  reasonMax: constraints[REASON_CONSTRAINT]?.max ?? 0,
});

interface ShareValues {
  readonly grantee_user_id: string;
  readonly scope: string;
  readonly period_from: string;
  readonly period_to: string;
  readonly expires_at: string;
  readonly change_reason: string;
}

interface CreateShareDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  readonly onCreated: () => void;
}

/** Authorizes a summary for an entity: who, which scope and period, why, and until when. */
export function CreateShareDialog(props: CreateShareDialogProps): JSX.Element {
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      trigger={props.trigger}
      title={t('entities.createTitle')}
      description={t('entities.createDescription')}
    >
      <CreateShareGate {...props} />
    </Dialog>
  );
}

function CreateShareGate(props: CreateShareDialogProps): JSX.Element {
  const form = useFormSchema(createFormBuild);
  const users = useAllUsers();
  const memberships = useAllMemberships();
  const [openedAtMs] = useState(() => Date.now());
  if (form.status === 'loading' || users.isPending || memberships.isPending) {
    return <LoadingState message={t('auth.loadingForm')} />;
  }
  if (form.status !== 'ready' || users.isError || memberships.isError) {
    return (
      <ErrorState title={t('entities.createTitle')} message={t('connection.constraintsMissing')} />
    );
  }
  return (
    <CreateShareForm
      {...props}
      schema={form.schema.schema}
      reasonMax={form.schema.reasonMax}
      grantees={supportEntityAccounts(users.data, memberships.data, openedAtMs)}
    />
  );
}

interface Grantee {
  readonly userId: string;
  readonly label: string;
}

/** Accounts whose current role is SUPPORT_ENTITY: the only ones a summary may go to. */
function supportEntityAccounts(
  users: readonly ManagedUserView[],
  memberships: readonly ManagedMembershipView[],
  nowMs: number,
): readonly Grantee[] {
  const roles: AccountRole[] = memberships.map((membership) => ({
    membershipId: membership.id,
    userId: membership.userId,
    roleCode: membership.roleCode,
    validFromMs: membership.validFrom.date.getTime(),
    validToMs: membership.validTo === null ? null : membership.validTo.date.getTime(),
  }));
  const current = currentRoleByUser(roles, nowMs);
  return users
    .filter((user) => current.get(user.id)?.roleCode === SUPPORT_ENTITY)
    .map((user) => ({ userId: user.id, label: `${user.fullName} (${user.username})` }));
}

interface CreateShareFormProps extends CreateShareDialogProps {
  readonly schema: ReturnType<typeof createFormBuild>['schema'];
  readonly reasonMax: number;
  readonly grantees: readonly Grantee[];
}

function CreateShareForm({
  onCreated,
  onOpenChange,
  schema,
  reasonMax,
  grantees,
}: CreateShareFormProps): JSX.Element {
  const create = useCreateSummaryShare();
  const [failure, setFailure] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ShareValues, unknown, ShareValues>({
    resolver: formResolver<ShareValues, ShareValues>(schema),
    mode: 'onSubmit',
    defaultValues: {
      grantee_user_id: '',
      scope: '',
      period_from: '',
      period_to: '',
      expires_at: '',
      change_reason: '',
    },
  });
  const typedReason = useWatch({ control, name: FIELD.changeReason });
  const submit = handleSubmit(async (values) => {
    setFailure(null);
    const expiresAt = bogotaLocalToIso(values.expires_at);
    if (expiresAt === null) {
      setFailure(t('entities.expiryInvalid'));
      return;
    }
    const input: CreateSummaryShareInput = {
      granteeUserId: values.grantee_user_id,
      scope: values.scope === 'MINUTES' ? 'MINUTES' : 'MONTHLY_SUMMARY',
      periodFrom: values.period_from,
      periodTo: values.period_to,
      reason: values.change_reason,
      expiresAt,
    };
    try {
      await create.mutateAsync(input);
      onCreated();
      onOpenChange(false);
    } catch (error) {
      setFailure(errorText(error).message);
    }
  });

  if (grantees.length === 0) {
    return <p>{t('entities.noGrantees')}</p>;
  }
  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failure === null ? null : <FormAlert message={failure} />}
        <RadioGroupField
          legend={t('entities.granteeLegend')}
          options={grantees.map((grantee) => ({ value: grantee.userId, label: grantee.label }))}
          error={errors.grantee_user_id?.message}
          {...register(FIELDS.grantee)}
        />
        <RadioGroupField
          legend={t('entities.scopeLegend')}
          options={SCOPES.map((scope) => ({ value: scope, label: summaryScopeText(scope) }))}
          error={errors.scope?.message}
          {...register(FIELDS.scope)}
        />
        <TextField
          label={t('entities.periodFromLabel')}
          type="date"
          error={errors.period_from?.message}
          {...register(FIELDS.periodFrom)}
        />
        <TextField
          label={t('entities.periodToLabel')}
          type="date"
          error={errors.period_to?.message}
          {...register(FIELDS.periodTo)}
        />
        <TextField
          label={t('entities.expiresLabel')}
          hint={t('entities.expiresHint')}
          type="datetime-local"
          error={errors.expires_at?.message}
          {...register(FIELDS.expiresAt)}
        />
        <TextAreaField
          label={t('entities.reasonLabel')}
          hint={t('entities.reasonHint')}
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
            {isSubmitting ? t('entities.submittingCreate') : t('entities.submitCreate')}
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

interface RevokeShareDialogProps {
  readonly shareId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  readonly onRevoked: () => void;
}

/** Revoking asks first: the entity loses the summary at once. */
export function RevokeShareDialog({
  shareId,
  open,
  onOpenChange,
  trigger,
  onRevoked,
}: RevokeShareDialogProps): JSX.Element {
  const revoke = useRevokeSummaryShare();
  const [failure, setFailure] = useState<string | null>(null);
  const confirm = (): void => {
    setFailure(null);
    revoke
      .mutateAsync(shareId)
      .then(() => {
        onRevoked();
        onOpenChange(false);
      })
      .catch((error: unknown) => {
        setFailure(errorText(error).message);
      });
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t('entities.revokeTitle')}
      description={t('entities.revokeDescription')}
    >
      <FormFields disabled={revoke.isPending}>
        {failure === null ? null : <FormAlert message={failure} />}
        <div className={cn(styles.actions)}>
          <Button variant="primary" onClick={confirm}>
            {revoke.isPending ? t('entities.submittingRevoke') : t('entities.submitRevoke')}
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
