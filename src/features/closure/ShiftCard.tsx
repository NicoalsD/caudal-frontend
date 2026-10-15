import { useState } from 'react';
import type { JSX } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { formatTime } from '../../core/format/time';
import { SHIFT_FIELD } from '../../core/forms/formSchemas';
import type { shiftExecutionFormSchema } from '../../core/forms/formSchemas';
import { toExecutionTimes } from '../../core/execution/shiftExecution';
import type { ExecutionTimesError, ShiftStatus } from '../../core/execution/shiftExecution';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import type { DayShiftView } from '../../services/api/views';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { FormFields } from '../../ui/primitives/FormFields';
import { formResolver } from '../../ui/primitives/formResolver';
import { RadioGroupField } from '../../ui/primitives/RadioGroupField';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './DayClosure.module.css';
import { useRecordExecution } from './closureQueries';

interface ShiftValues {
  readonly status: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly note: string;
}

/** The text of each time error, by its code (core/execution). */
const TIME_ERROR_TEXT = {
  START_REQUIRED: 'closure.startRequired',
  TIME_INVALID: 'closure.timeInvalid',
  END_NOT_AFTER_START: 'closure.endNotAfterStart',
} as const satisfies Readonly<Record<ExecutionTimesError, string>>;

const STATUS_OPTIONS: readonly { readonly value: ShiftStatus; readonly label: string }[] = [
  { value: 'COMPLETED', label: t('closure.statusCompleted') },
  { value: 'PARTIAL', label: t('closure.statusPartial') },
  { value: 'NOT_EXECUTED', label: t('closure.statusNotExecuted') },
];

interface ShiftCardProps {
  readonly item: DayShiftView;
  readonly sectorName: string;
  readonly serviceDate: string;
  readonly schema: ReturnType<typeof shiftExecutionFormSchema>;
  readonly noteMax: number;
  readonly online: boolean;
}

/**
 * One shift of the day (S10): how it went, the real start and end when it went partly, and a
 * note. Each shift is saved on its own (API.md 11.1). A saved shift that is changed is sent as a
 * replacement (`supersedes_id`): an execution is never edited.
 */
export function ShiftCard({
  item,
  sectorName,
  serviceDate,
  schema,
  noteMax,
  online,
}: ShiftCardProps): JSX.Element {
  const record = useRecordExecution();
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, control, setError, formState } = useForm<ShiftValues>({
    resolver: formResolver<ShiftValues>(schema),
    mode: 'onSubmit',
    defaultValues: { status: '', startTime: '', endTime: '', note: '' },
  });
  const { errors } = formState;
  const status = useWatch({ control, name: SHIFT_FIELD.status });
  const note = useWatch({ control, name: 'note' }) ?? '';
  const isPartial = status === 'PARTIAL';
  const startLabel = formatTime(item.startAt.date.toISOString());
  const endLabel = formatTime(item.endAt.date.toISOString());

  const submit = handleSubmit((values) => {
    const times = toExecutionTimes(serviceDate, {
      status: values.status as ShiftStatus,
      startTime: values.startTime,
      endTime: values.endTime,
    });
    if (!times.ok) {
      setError(times.field === 'startTime' ? SHIFT_FIELD.startTime : SHIFT_FIELD.endTime, {
        message: t(TIME_ERROR_TEXT[times.error]),
      });
      return;
    }
    setSaved(false);
    record.mutate(
      {
        scheduleItemId: item.id,
        status: values.status as ShiftStatus,
        actualStart: times.actualStart,
        actualEnd: times.actualEnd,
        note: values.note,
        supersedesId: executionId,
      },
      {
        onSuccess: (view) => {
          setExecutionId(view.id);
          setSaved(true);
        },
      },
    );
  });

  const failure = record.isError ? errorText(record.error).message : null;

  return (
    <section className={cn(styles.card)} aria-labelledby={`shift-${item.id}`}>
      <h2 id={`shift-${item.id}`} className={cn(styles.cardTitle)}>
        {sectorName}
      </h2>
      <p className={cn(styles.cardHours)}>
        {t('closure.shiftHours', { start: startLabel, end: endLabel })}
      </p>
      <form onSubmit={(event) => void submit(event)} noValidate className={cn(styles.form)}>
        <FormFields disabled={record.isPending}>
          <RadioGroupField
            legend={t('closure.statusGroup')}
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register(SHIFT_FIELD.status)}
          />
          {isPartial ? (
            <>
              <TextField
                type="time"
                label={t('closure.actualStart')}
                hint={t('closure.actualStartHint')}
                error={errors.startTime?.message}
                {...register(SHIFT_FIELD.startTime)}
              />
              <TextField
                type="time"
                label={t('closure.actualEnd')}
                error={errors.endTime?.message}
                {...register(SHIFT_FIELD.endTime)}
              />
            </>
          ) : null}
          <TextAreaField
            label={t('closure.note')}
            hint={t('closure.noteHint')}
            length={note.length}
            maxLength={noteMax}
            counterText={(length, max) =>
              t('publicReport.counter', { length: String(length), max: String(max) })
            }
            {...register('note')}
          />
          {failure === null ? null : <FormAlert message={failure} />}
          {saved ? <p role="status">{t('closure.saved')}</p> : null}
          {online ? null : <p role="status">{t('closure.offline')}</p>}
          <div>
            <Button type="submit" disabled={!online || record.isPending}>
              {record.isPending
                ? t('closure.saving')
                : executionId === null
                  ? t('closure.save')
                  : t('closure.saveChange')}
            </Button>
          </div>
        </FormFields>
      </form>
    </section>
  );
}
