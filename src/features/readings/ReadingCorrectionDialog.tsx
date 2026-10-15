import { useCallback, useMemo, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import type { DecimalRule } from '../../core/forms/FormSchemaBuilder';
import {
  FIELD,
  READING_REASON_CONSTRAINT,
  correctionFormSchema,
} from '../../core/forms/formSchemas';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { formatDecimal, toInputText } from '../../core/format/decimal';
import type { Gauge } from '../../core/rules/ruleSetParts';
import { errorText } from '../../i18n/errorText';
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
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './Readings.module.css';
import { gaugeDecimalRule } from './gaugeRule';
import { useCorrectReading } from './readingQueries';

interface ReadingCorrectionDialogProps {
  /** The id of the reading on the server: the client UUID it was sent with. */
  readonly readingId: string;
  /** The value the reading shows now, filled in as the starting point. */
  readonly currentValue: number;
  /** The range of the tank (rule set or tank). Null while it is unknown. */
  readonly gauge: Gauge | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  /** Called after the server stored the correction. */
  readonly onCorrected: () => void;
}

/**
 * Corrects a saved reading with a mandatory reason. The range and the reason limits come from the
 * server (rule set and /meta/constraints); the original value is kept by the server.
 */
export function ReadingCorrectionDialog({
  readingId,
  currentValue,
  gauge,
  open,
  onOpenChange,
  trigger,
  onCorrected,
}: ReadingCorrectionDialogProps): JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t('readings.correction.title')}
      description={t('readings.correction.description')}
    >
      {gauge === null ? (
        <LoadingState message={t('auth.loadingForm')} />
      ) : (
        <CorrectionSchemaForm
          readingId={readingId}
          currentValue={currentValue}
          gauge={gauge}
          onDone={() => {
            onOpenChange(false);
            onCorrected();
          }}
          onCancel={() => {
            onOpenChange(false);
          }}
        />
      )}
    </Dialog>
  );
}

function buildCorrectionForm(rule: DecimalRule) {
  return (constraints: ConstraintsMap, messages: ValidationMessageFactory) => ({
    schema: correctionFormSchema(constraints, rule, messages),
    reasonMax: constraints[READING_REASON_CONSTRAINT]?.max ?? 0,
  });
}

interface CorrectionSchemaFormProps {
  readonly readingId: string;
  readonly currentValue: number;
  readonly gauge: Gauge;
  readonly onDone: () => void;
  readonly onCancel: () => void;
}

/** Builds the schema from the range and the server limits, then shows the form. */
function CorrectionSchemaForm(props: CorrectionSchemaFormProps): JSX.Element {
  const { gauge } = props;
  const rule = useMemo(() => gaugeDecimalRule(gauge), [gauge]);
  const build = useCallback(
    (constraints: ConstraintsMap, messages: ValidationMessageFactory) =>
      buildCorrectionForm(rule)(constraints, messages),
    [rule],
  );
  const form = useFormSchema(build);
  if (form.status === 'loading') {
    return <LoadingState message={t('auth.loadingForm')} />;
  }
  if (form.status === 'unavailable') {
    return (
      <ErrorState
        title={t('readings.correction.title')}
        message={t('connection.constraintsMissing')}
      />
    );
  }
  if (form.status === 'misconfigured') {
    return (
      <ErrorState title={t('readings.correction.title')} message={t('errors.configMissing')} />
    );
  }
  return (
    <CorrectionForm {...props} schema={form.schema.schema} reasonMax={form.schema.reasonMax} />
  );
}

interface CorrectionValues {
  corrected_gauge_value: string;
  change_reason: string;
}

interface CorrectionOutput {
  corrected_gauge_value: number;
  change_reason: string;
}

interface CorrectionFormProps extends CorrectionSchemaFormProps {
  readonly schema: ReturnType<typeof correctionFormSchema>;
  readonly reasonMax: number;
}

function CorrectionForm({
  readingId,
  currentValue,
  gauge,
  schema,
  reasonMax,
  onDone,
  onCancel,
}: CorrectionFormProps): JSX.Element {
  const correct = useCorrectReading();
  const [failure, setFailure] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CorrectionValues, unknown, CorrectionOutput>({
    resolver: formResolver<CorrectionValues, CorrectionOutput>(schema),
    mode: 'onSubmit',
    defaultValues: { corrected_gauge_value: toInputText(currentValue), change_reason: '' },
  });
  const typedReason = useWatch({ control, name: FIELD.changeReason });
  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await correct.mutateAsync({
        readingId,
        correctedGaugeValue: values.corrected_gauge_value,
        reason: values.change_reason,
      });
      onDone();
    } catch (error) {
      setFailure(errorText(error).message);
    }
  });
  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failure === null ? null : <FormAlert message={failure} />}
        <TextField
          label={t('readings.correction.valueLabel')}
          hint={t('readings.gaugeHint', {
            min: formatDecimal(gauge.min),
            max: formatDecimal(gauge.max),
          })}
          inputMode="decimal"
          autoComplete="off"
          error={errors.corrected_gauge_value?.message}
          {...register(FIELD.correctedGaugeValue)}
        />
        <TextAreaField
          label={t('readings.correction.reasonLabel')}
          hint={t('readings.correction.reasonHint')}
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
            {isSubmitting ? t('readings.correction.submitting') : t('readings.correction.submit')}
          </Button>
          <Button onClick={onCancel}>{t('common.cancel')}</Button>
        </div>
      </FormFields>
    </form>
  );
}
