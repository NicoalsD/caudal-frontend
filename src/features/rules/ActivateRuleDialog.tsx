import { useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import { FIELD, reasonSchema } from '../../core/forms/formSchemas';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { t } from '../../i18n/t';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { Dialog } from '../../ui/primitives/Dialog';
import { formResolver } from '../../ui/primitives/formResolver';
import { FormFields } from '../../ui/primitives/FormFields';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { cn } from '../../ui/styles/cn';
import styles from './Rules.module.css';
import { activationFailure } from './activationErrors';
import type { ActivationFailure } from './activationErrors';
import { useActivateRuleSet } from './ruleQueries';

interface ActivateRuleDialogProps {
  readonly ruleSetId: string;
  readonly version: number;
  /** The button that opens the dialog (it gets the focus back on close). */
  readonly trigger: ReactNode;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Called after the server activated the version. */
  readonly onActivated: (version: number) => void;
}

interface ReasonValues {
  change_reason: string;
}

const REASON_FIELD = FIELD.changeReason;

/** The schema of the reason and the maximum it shows in the counter, both from /meta/constraints. */
function buildReasonForm(constraints: ConstraintsMap, messages: ValidationMessageFactory) {
  return { schema: reasonSchema(constraints, messages), max: constraints[REASON_FIELD]?.max ?? 0 };
}

/**
 * Asks for the reason (10 to 500 characters, from /meta/constraints) before activating a draft.
 * Only BOARD_ADMIN sees the button that opens it, and the server checks the role again.
 */
export function ActivateRuleDialog({
  ruleSetId,
  version,
  trigger,
  open,
  onOpenChange,
  onActivated,
}: ActivateRuleDialogProps): JSX.Element {
  const form = useFormSchema(buildReasonForm);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t('rules.activateTitle', { version: String(version) })}
      description={t('rules.activateDescription')}
    >
      {form.status === 'loading' ? <LoadingState message={t('auth.loadingForm')} /> : null}
      {form.status === 'unavailable' ? (
        <ErrorState title={t('rules.activate')} message={t('connection.constraintsMissing')} />
      ) : null}
      {form.status === 'misconfigured' ? (
        <ErrorState title={t('rules.activate')} message={t('errors.configMissing')} />
      ) : null}
      {form.status === 'ready' ? (
        <ReasonForm
          schema={form.schema.schema}
          maxLength={form.schema.max}
          ruleSetId={ruleSetId}
          onCancel={() => {
            onOpenChange(false);
          }}
          onActivated={() => {
            onActivated(version);
          }}
        />
      ) : null}
    </Dialog>
  );
}

interface ReasonFormProps {
  readonly schema: ReturnType<typeof reasonSchema>;
  readonly maxLength: number;
  readonly ruleSetId: string;
  readonly onCancel: () => void;
  readonly onActivated: () => void;
}

function ReasonForm({
  schema,
  maxLength,
  ruleSetId,
  onCancel,
  onActivated,
}: ReasonFormProps): JSX.Element {
  const activate = useActivateRuleSet(ruleSetId);
  const [failure, setFailure] = useState<ActivationFailure | null>(null);
  const { register, handleSubmit, control, setError, formState } = useForm<ReasonValues>({
    resolver: formResolver<ReasonValues>(schema),
    mode: 'onSubmit',
    defaultValues: { change_reason: '' },
  });
  const typed = useWatch({ control, name: REASON_FIELD });
  const { errors, isSubmitting } = formState;

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await activate.mutateAsync(values.change_reason);
      onActivated();
    } catch (error) {
      const result = activationFailure(error);
      if (result.field === null) {
        setFailure(result);
      } else {
        setError(result.field, { type: 'server', message: result.message }, { shouldFocus: true });
      }
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failure === null ? null : (
          <FormAlert message={failure.message} detail={failure.supportCode} />
        )}
        {failure === null || failure.problems.length === 0 ? null : (
          <ul className={cn(styles.problemList)}>
            {failure.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
        <TextAreaField
          label={t('rules.reasonLabel')}
          hint={t('rules.reasonHint')}
          length={typed.length}
          maxLength={maxLength}
          counterText={(length, max) =>
            t('rules.reasonCounter', { length: String(length), max: String(max) })
          }
          error={errors.change_reason?.message}
          {...register(REASON_FIELD)}
        />
        <div className={cn(styles.actions)}>
          <Button type="submit" variant="primary">
            {isSubmitting ? t('rules.activating') : t('rules.confirmActivate')}
          </Button>
          <Button onClick={onCancel}>{t('rules.cancel')}</Button>
        </div>
      </FormFields>
    </form>
  );
}
