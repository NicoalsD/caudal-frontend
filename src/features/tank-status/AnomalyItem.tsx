import { useState } from 'react';
import type { JSX } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import {
  DISMISSAL_NOTE_FIELD,
  REASON_CONSTRAINT,
  dismissalNoteSchema,
} from '../../core/forms/formSchemas';
import { t } from '../../i18n/t';
import type { AnomalyView } from '../../services/api/views';
import { useConstraints } from '../../state/hooks/useConstraints';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { useResolveAnomaly } from '../../state/hooks/useAnomalies';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { FormFields } from '../../ui/primitives/FormFields';
import { formResolver } from '../../ui/primitives/formResolver';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { cn } from '../../ui/styles/cn';
import { anomalyKindText } from './anomalyKindText';
import styles from './TankStatus.module.css';

interface DismissValues {
  readonly note: string;
}

interface AnomalyItemProps {
  readonly anomaly: AnomalyView;
  /** True when the person may review (permission ANOMALY_REVIEW). */
  readonly canReview: boolean;
}

/** One pending anomaly with its plain-language kind; the review actions only for the Board. */
export function AnomalyItem({ anomaly, canReview }: AnomalyItemProps): JSX.Element {
  const [dismissing, setDismissing] = useState(false);
  const change = useResolveAnomaly();
  const constraints = useConstraints();
  const noteSchema = useFormSchema(dismissalNoteSchema);
  const noteMax = constraints.data?.[REASON_CONSTRAINT]?.max;
  const failure = change.isError ? t('anomalies.failure') : null;

  return (
    <li className={cn(styles.anomaly)}>
      <p>
        <strong>{anomalyKindText(anomaly.kind)}</strong>
      </p>
      <p className={cn(styles.muted)}>
        {t('anomalies.detectedAt', { date: anomaly.detectedAt.text })}
      </p>
      {anomaly.gaugeValue === null ? null : (
        <p>{t('anomalies.gaugeValue', { value: anomaly.gaugeValue.text })}</p>
      )}
      {canReview ? (
        dismissing ? (
          noteSchema.status === 'ready' && noteMax !== undefined ? (
            <DismissForm
              schema={noteSchema.schema}
              noteMax={noteMax}
              isSaving={change.isPending}
              failure={failure}
              onConfirm={(note) =>
                change.mutate(
                  { id: anomaly.id, status: 'DISMISSED', note },
                  {
                    onSuccess: () => setDismissing(false),
                  },
                )
              }
              onCancel={() => setDismissing(false)}
            />
          ) : (
            <p>{t('anomalies.constraintsMissing')}</p>
          )
        ) : (
          <div className={cn(styles.actions)}>
            <Button
              variant="primary"
              disabled={change.isPending}
              onClick={() => change.mutate({ id: anomaly.id, status: 'CONFIRMED' })}
            >
              {t('anomalies.confirm')}
            </Button>
            <Button disabled={change.isPending} onClick={() => setDismissing(true)}>
              {t('anomalies.dismiss')}
            </Button>
            {failure === null ? null : <FormAlert message={failure} />}
          </div>
        )
      ) : null}
    </li>
  );
}

interface DismissFormProps {
  readonly schema: ReturnType<typeof dismissalNoteSchema>;
  /** The server's limit for the reason: the counter shows it. */
  readonly noteMax: number;
  readonly isSaving: boolean;
  readonly failure: string | null;
  readonly onConfirm: (note: string) => void;
  readonly onCancel: () => void;
}

/** The reason that dismisses an anomaly: required, with the server's limits (API.md 9.2). */
function DismissForm({
  schema,
  noteMax,
  isSaving,
  failure,
  onConfirm,
  onCancel,
}: DismissFormProps): JSX.Element {
  const { register, handleSubmit, control, formState } = useForm<DismissValues>({
    resolver: formResolver<DismissValues>(schema),
    mode: 'onSubmit',
    defaultValues: { note: '' },
  });
  const note = useWatch({ control, name: DISMISSAL_NOTE_FIELD }) ?? '';
  const submit = handleSubmit((values) => {
    onConfirm(values.note);
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <FormFields disabled={isSaving}>
        {failure === null ? null : <FormAlert message={failure} />}
        <TextAreaField
          label={t('anomalies.dismissLabel')}
          hint={t('anomalies.dismissHint')}
          length={note.length}
          maxLength={noteMax}
          counterText={(length, max) =>
            t('publicReport.counter', { length: String(length), max: String(max) })
          }
          error={formState.errors.note?.message}
          {...register(DISMISSAL_NOTE_FIELD)}
        />
        <div className={cn(styles.actions)}>
          <Button type="submit" variant="primary">
            {isSaving ? t('anomalies.saving') : t('anomalies.dismissConfirm')}
          </Button>
          <Button onClick={onCancel}>{t('anomalies.cancel')}</Button>
        </div>
      </FormFields>
    </form>
  );
}
