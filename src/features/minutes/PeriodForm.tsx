import { useState } from 'react';
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';

import { periodError } from '../../core/minutes/minutesPeriod';
import type { PeriodError } from '../../core/minutes/minutesPeriod';
import { t } from '../../i18n/t';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { FormFields } from '../../ui/primitives/FormFields';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './Minutes.module.css';
import type { PeriodInput } from './minutesQueries';

interface PeriodValues {
  readonly periodFrom: string;
  readonly periodTo: string;
}

const PERIOD_ERROR_TEXT = {
  PERIOD_REQUIRED: 'minutes.periodRequired',
  PERIOD_REVERSED: 'minutes.periodReversed',
} as const satisfies Record<PeriodError, string>;

interface PeriodFormProps {
  readonly isSaving: boolean;
  /** The server's refusal of the last try, already in words; null when there is none. */
  readonly failure: string | null;
  readonly onSubmit: (input: PeriodInput) => void;
  readonly onCancel: () => void;
}

/** Chooses the period of an acta: two service days, the end not before the start (API.md 13.1). */
export function PeriodForm({
  isSaving,
  failure,
  onSubmit,
  onCancel,
}: PeriodFormProps): JSX.Element {
  const { register, handleSubmit } = useForm<PeriodValues>({
    defaultValues: { periodFrom: '', periodTo: '' },
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = handleSubmit((values) => {
    const error = periodError(values.periodFrom, values.periodTo);
    if (error !== null) {
      setLocalError(t(PERIOD_ERROR_TEXT[error]));
      return;
    }
    setLocalError(null);
    onSubmit({ periodFrom: values.periodFrom, periodTo: values.periodTo });
  });
  const message = localError ?? failure;

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className={cn(styles.stack)}>
      <FormFields disabled={isSaving}>
        {message === null ? null : <FormAlert message={message} />}
        <TextField type="date" label={t('minutes.periodFrom')} {...register('periodFrom')} />
        <TextField
          type="date"
          label={t('minutes.periodTo')}
          hint={t('minutes.periodHint')}
          {...register('periodTo')}
        />
        <div className={cn(styles.actions)}>
          <Button type="submit" variant="primary">
            {isSaving ? t('minutes.generating') : t('minutes.periodSubmit')}
          </Button>
          <Button type="button" onClick={onCancel}>
            {t('minutes.cancel')}
          </Button>
        </div>
      </FormFields>
    </form>
  );
}
