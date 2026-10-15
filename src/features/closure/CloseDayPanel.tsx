import { useState } from 'react';
import type { JSX } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { DomainError } from '../../core/errors/DomainError';
import { CLOSURE_NOTES_FIELD } from '../../core/forms/formSchemas';
import type { closureNotesSchema } from '../../core/forms/formSchemas';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { Dialog } from '../../ui/primitives/Dialog';
import { FormFields } from '../../ui/primitives/FormFields';
import { formResolver } from '../../ui/primitives/formResolver';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { cn } from '../../ui/styles/cn';
import styles from './DayClosure.module.css';
import { useCloseDay } from './closureQueries';

interface NotesValues {
  readonly notes: string;
}

/** The closure form (S10): the day's note and "Cerrar el día", confirmed in a dialog. */
interface CloseDayPanelProps {
  readonly serviceDate: string;
  readonly schema: ReturnType<typeof closureNotesSchema>;
  readonly noteMax: number;
  readonly shiftCount: number;
  readonly online: boolean;
  /** Called when the server says the day is already closed: the page shows the read-only view. */
  readonly onAlreadyClosed: () => void;
}

const CONFLICT_CODE = 'CONFLICT';

export function CloseDayPanel({
  serviceDate,
  schema,
  noteMax,
  shiftCount,
  online,
  onAlreadyClosed,
}: CloseDayPanelProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const close = useCloseDay(serviceDate);
  const { register, handleSubmit, control, formState } = useForm<NotesValues>({
    resolver: formResolver<NotesValues>(schema),
    mode: 'onSubmit',
    defaultValues: { notes: '' },
  });
  const notes = useWatch({ control, name: CLOSURE_NOTES_FIELD }) ?? '';

  // The note is checked when the closure is confirmed; an invalid note closes the dialog.
  const submitClosure = handleSubmit(
    (values) => {
      close.mutate(values.notes, {
        onSuccess: () => {
          setConfirming(false);
        },
        onError: (error) => {
          setConfirming(false);
          if (error instanceof DomainError && error.code === CONFLICT_CODE) {
            onAlreadyClosed();
          }
        },
      });
    },
    () => {
      setConfirming(false);
    },
  );

  const failure =
    close.isError && !(close.error instanceof DomainError && close.error.code === CONFLICT_CODE)
      ? errorText(close.error).message
      : null;

  return (
    <section className={cn(styles.card)} aria-labelledby="close-day-title">
      <h2 id="close-day-title" className={cn(styles.cardTitle)}>
        {t('closure.closeSection')}
      </h2>
      <p className={cn(styles.cardHours)}>
        {t('closure.closeCount', { count: String(shiftCount) })}
      </p>
      <form noValidate className={cn(styles.form)}>
        <FormFields disabled={close.isPending}>
          <TextAreaField
            label={t('closure.closeNotesLabel')}
            hint={t('closure.closeNotesHint')}
            length={notes.length}
            maxLength={noteMax}
            counterText={(length, max) =>
              t('publicReport.counter', { length: String(length), max: String(max) })
            }
            error={formState.errors.notes?.message}
            {...register(CLOSURE_NOTES_FIELD)}
          />
          {failure === null ? null : <FormAlert message={failure} />}
          <div>
            <Dialog
              open={confirming}
              onOpenChange={setConfirming}
              title={t('closure.closeAction')}
              description={t('closure.closeDialogDescription')}
              trigger={
                <Button type="button" variant="primary" disabled={!online || close.isPending}>
                  {close.isPending ? t('closure.closing') : t('closure.closeAction')}
                </Button>
              }
            >
              <div className={cn(styles.actions)}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void submitClosure()}
                  disabled={close.isPending}
                >
                  {t('closure.closeConfirm')}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                  }}
                >
                  {t('closure.closeCancel')}
                </Button>
              </div>
            </Dialog>
          </div>
          {online ? null : <p role="status">{t('closure.offline')}</p>}
        </FormFields>
      </form>
    </section>
  );
}
