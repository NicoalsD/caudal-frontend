import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { JSX, ReactNode, RefObject } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { TriangleAlert } from 'lucide-react';

import type { OutboxItemSummary } from '../../core/commands/summarizeOutbox';
import type { RejectionDetails } from '../../core/commands/OutboxRecord';
import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import type { DecimalRule } from '../../core/forms/FormSchemaBuilder';
import { FIELD, gaugeValueSchema, reasonSchema } from '../../core/forms/formSchemas';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { DomainError } from '../../core/errors/DomainError';
import { formatDateTime } from '../../core/format/time';
import { formatDecimal, toInputText } from '../../core/format/decimal';
import type { Gauge } from '../../core/rules/ruleSetParts';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { useTanks } from '../../state/hooks/useTanks';
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
import { gaugeDecimalRule, resolveGauge } from './gaugeRule';
import { useDiscardRejectedReading, useResendRejectedReading } from './readingQueries';

const ICON_SIZE = 20;
const GAUGE_MESSAGE_FALLBACK_KEY = 'errors.generic';

/**
 * The plain-language text of a refusal: the server code is mapped in es.ts (errors.api). The gauge
 * range comes from the server's details or, when they are missing, from the rule set on the phone.
 */
export function refusalMessage(
  code: string,
  details: RejectionDetails,
  gauge: Gauge | null,
): string {
  const range =
    gauge === null
      ? {}
      : { gauge_min: formatDecimal(gauge.min), gauge_max: formatDecimal(gauge.max) };
  const text = errorText(new DomainError(code, '', { ...range, ...details })).message;
  // A template value with no data behind it is never shown: the generic text takes its place.
  return text.includes('{') ? t(GAUGE_MESSAGE_FALLBACK_KEY) : text;
}

/** Refused readings of the signed-in person: the person fixes the value and resends, or discards. */
export function ReadingIssues(): JSX.Element | null {
  const summary = useSyncQueue();
  const tanks = useTanks();
  const ruleSet = useCurrentRuleSet();
  const headingId = useId();
  const review = summary.items.filter((item) => item.status === 'CORRECTION_PENDING');
  if (review.length === 0) {
    return null;
  }
  return (
    <section className={cn(styles.review)} aria-labelledby={headingId}>
      <h2 id={headingId}>{t('readings.review.title')}</h2>
      {review.map((item) => (
        <ReadingIssueCard
          key={item.clientId}
          item={item}
          gauge={resolveGauge(
            ruleSet.data?.gauge,
            tanks.data?.find((tank) => tank.id === item.tankId),
          )}
        />
      ))}
    </section>
  );
}

interface ReadingIssueCardProps {
  readonly item: OutboxItemSummary;
  readonly gauge: Gauge | null;
}

/** One refused reading: when it was taken, why the server refused it and the two actions. */
export function ReadingIssueCard({ item, gauge }: ReadingIssueCardProps): JSX.Element {
  const headingId = useId();
  const [resending, setResending] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const dateText =
    item.observedAt === null
      ? t('readings.review.unknownDate')
      : t('readings.review.observedAt', { date: formatDateTime(item.observedAt) });
  return (
    <article className={cn(styles.issue)} aria-labelledby={headingId}>
      <h3 id={headingId} className={cn(styles.issueTitle)}>
        {dateText}
      </h3>
      <p className={cn(styles.issueStatus)}>
        <TriangleAlert aria-hidden="true" size={ICON_SIZE} />
        <span>{t('readings.review.notSaved')}</span>
      </p>
      <p>{refusalMessage(item.lastErrorCode ?? '', item.lastErrorDetails ?? {}, gauge)}</p>
      <div className={cn(styles.actions)}>
        <ResendDialog
          item={item}
          gauge={gauge}
          open={resending}
          onOpenChange={setResending}
          trigger={<Button variant="primary">{t('readings.review.correct')}</Button>}
        />
        <DiscardDialog
          item={item}
          open={discarding}
          onOpenChange={setDiscarding}
          trigger={<Button>{t('readings.review.discard')}</Button>}
        />
      </div>
    </article>
  );
}

interface DialogBaseProps {
  readonly item: OutboxItemSummary;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
}

interface ResendDialogProps extends DialogBaseProps {
  readonly gauge: Gauge | null;
}

/** The corrected value of a refused reading. It is checked against the range before it is sent. */
function ResendDialog({
  item,
  gauge,
  open,
  onOpenChange,
  trigger,
}: ResendDialogProps): JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t('readings.review.resendTitle')}
      description={t('readings.review.resendDescription')}
    >
      {gauge === null ? (
        <LoadingState message={t('auth.loadingForm')} />
      ) : (
        <ResendSchemaForm
          item={item}
          gauge={gauge}
          onDone={() => {
            onOpenChange(false);
          }}
        />
      )}
    </Dialog>
  );
}

function buildGaugeForm(rule: DecimalRule) {
  return (constraints: ConstraintsMap, messages: ValidationMessageFactory) => ({
    schema: gaugeValueSchema(constraints, rule, messages),
  });
}

interface ResendSchemaFormProps {
  readonly item: OutboxItemSummary;
  readonly gauge: Gauge;
  readonly onDone: () => void;
}

/** Builds the gauge schema from the range (and the server limits), then shows the form. */
function ResendSchemaForm({ item, gauge, onDone }: ResendSchemaFormProps): JSX.Element {
  const rule = useMemo(() => gaugeDecimalRule(gauge), [gauge]);
  const build = useCallback(
    (constraints: ConstraintsMap, messages: ValidationMessageFactory) =>
      buildGaugeForm(rule)(constraints, messages),
    [rule],
  );
  const form = useFormSchema(build);
  if (form.status === 'loading') {
    return <LoadingState message={t('auth.loadingForm')} />;
  }
  if (form.status === 'unavailable') {
    return (
      <ErrorState
        title={t('readings.review.correct')}
        message={t('connection.constraintsMissing')}
      />
    );
  }
  if (form.status === 'misconfigured') {
    return <ErrorState title={t('readings.review.correct')} message={t('errors.configMissing')} />;
  }
  return <ResendForm item={item} gauge={gauge} schema={form.schema.schema} onDone={onDone} />;
}

interface ResendValues {
  gauge_value: string;
}

interface ResendOutput {
  gauge_value: number;
}

interface ResendFormProps {
  readonly item: OutboxItemSummary;
  readonly gauge: Gauge;
  readonly schema: ReturnType<typeof gaugeValueSchema>;
  readonly onDone: () => void;
}

function ResendForm({ item, gauge, schema, onDone }: ResendFormProps): JSX.Element {
  const resend = useResendRejectedReading();
  const ruleSet = useCurrentRuleSet();
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendValues, unknown, ResendOutput>({
    resolver: formResolver<ResendValues, ResendOutput>(schema),
    mode: 'onSubmit',
    defaultValues: {
      gauge_value: item.gaugeValue === null ? '' : toInputText(item.gaugeValue),
    },
  });
  const submit = handleSubmit(async (values) => {
    setFailed(false);
    try {
      await resend.mutateAsync({
        clientId: item.clientId,
        gaugeValue: values.gauge_value,
        ruleSetVersionId: ruleSet.data?.id ?? null,
      });
      onDone();
    } catch {
      setFailed(true);
    }
  });
  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failed ? <FormAlert message={t('readings.serverError')} /> : null}
        <TextField
          label={t('readings.gaugeLabel')}
          hint={t('readings.gaugeHint', {
            min: formatDecimal(gauge.min),
            max: formatDecimal(gauge.max),
          })}
          inputMode="decimal"
          autoComplete="off"
          error={errors.gauge_value?.message}
          {...register(FIELD.gaugeValue)}
        />
        <div className={cn(styles.actions)}>
          <Button type="submit" variant="primary">
            {isSubmitting ? t('readings.review.resending') : t('readings.review.resendSubmit')}
          </Button>
        </div>
      </FormFields>
    </form>
  );
}

interface ReasonValues {
  change_reason: string;
}

function buildReasonForm(constraints: ConstraintsMap, messages: ValidationMessageFactory) {
  return {
    schema: reasonSchema(constraints, messages),
    max: constraints[FIELD.changeReason]?.max ?? 0,
  };
}

/** Discarding asks for a reason first; Cancel has the focus when the dialog opens. */
function DiscardDialog({ item, open, onOpenChange, trigger }: DialogBaseProps): JSX.Element {
  const form = useFormSchema(buildReasonForm);
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t('readings.review.discardTitle')}
      description={t('readings.review.discardDescription')}
      initialFocusRef={cancelRef}
    >
      {form.status === 'loading' ? <LoadingState message={t('auth.loadingForm')} /> : null}
      {form.status === 'unavailable' ? (
        <ErrorState
          title={t('readings.review.discard')}
          message={t('connection.constraintsMissing')}
        />
      ) : null}
      {form.status === 'misconfigured' ? (
        <ErrorState title={t('readings.review.discard')} message={t('errors.configMissing')} />
      ) : null}
      {form.status === 'ready' ? (
        <DiscardForm
          item={item}
          schema={form.schema.schema}
          maxLength={form.schema.max}
          cancelRef={cancelRef}
          onCancel={() => {
            onOpenChange(false);
          }}
          onDone={() => {
            onOpenChange(false);
          }}
        />
      ) : null}
    </Dialog>
  );
}

interface DiscardFormProps {
  readonly item: OutboxItemSummary;
  readonly schema: ReturnType<typeof reasonSchema>;
  readonly maxLength: number;
  readonly cancelRef: RefObject<HTMLButtonElement | null>;
  readonly onCancel: () => void;
  readonly onDone: () => void;
}

function DiscardForm({
  item,
  schema,
  maxLength,
  cancelRef,
  onCancel,
  onDone,
}: DiscardFormProps): JSX.Element {
  const discard = useDiscardRejectedReading();
  const [failed, setFailed] = useState(false);
  const { register, handleSubmit, control, formState } = useForm<ReasonValues>({
    resolver: formResolver<ReasonValues>(schema),
    mode: 'onSubmit',
    defaultValues: { change_reason: '' },
  });
  const typed = useWatch({ control, name: FIELD.changeReason });
  const { errors, isSubmitting } = formState;
  const submit = handleSubmit(async (values) => {
    setFailed(false);
    try {
      await discard.mutateAsync({ clientId: item.clientId, reason: values.change_reason });
      onDone();
    } catch {
      setFailed(true);
    }
  });
  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failed ? <FormAlert message={t('errors.generic')} /> : null}
        <TextAreaField
          label={t('readings.review.discardReasonLabel')}
          hint={t('readings.review.discardReasonHint')}
          length={typed.length}
          maxLength={maxLength}
          counterText={(length, max) =>
            t('readings.review.counter', { length: String(length), max: String(max) })
          }
          error={errors.change_reason?.message}
          {...register(FIELD.changeReason)}
        />
        <div className={cn(styles.actions)}>
          <Button ref={cancelRef} onClick={onCancel}>
            {t('readings.review.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {isSubmitting ? t('readings.review.discarding') : t('readings.review.discardConfirm')}
          </Button>
        </div>
      </FormFields>
    </form>
  );
}
