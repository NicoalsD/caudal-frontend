import type { JSX } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { DISMISSAL_NOTE_FIELD } from '../../core/forms/formSchemas';
import type { dismissalNoteSchema } from '../../core/forms/formSchemas';
import { t } from '../../i18n/t';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { FormFields } from '../../ui/primitives/FormFields';
import { formResolver } from '../../ui/primitives/formResolver';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { cn } from '../../ui/styles/cn';
import styles from './Incidents.module.css';

interface DismissValues {
  readonly note: string;
}

interface IncidentDismissFormProps {
  readonly schema: ReturnType<typeof dismissalNoteSchema>;
  /** The server's limit for the note (reason): the counter shows it. */
  readonly noteMax: number;
  readonly isSaving: boolean;
  readonly failure: string | null;
  readonly onConfirm: (note: string) => void;
  readonly onCancel: () => void;
}

/** The note that explains a dismissal (S21). Only a dismissal asks for it. */
export function IncidentDismissForm({
  schema,
  noteMax,
  isSaving,
  failure,
  onConfirm,
  onCancel,
}: IncidentDismissFormProps): JSX.Element {
  const { register, handleSubmit, control, formState } = useForm<DismissValues>({
    resolver: formResolver<DismissValues>(schema),
    mode: 'onSubmit',
    defaultValues: { note: '' },
  });
  const { errors } = formState;
  const note = useWatch({ control, name: DISMISSAL_NOTE_FIELD }) ?? '';
  const submit = handleSubmit((values) => {
    onConfirm(values.note);
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className={cn(styles.dismiss)}>
      <FormFields disabled={isSaving}>
        {failure === null ? null : <FormAlert message={failure} />}
        <TextAreaField
          label={t('incidents.dismissLabel')}
          hint={t('incidents.dismissHint')}
          length={note.length}
          maxLength={noteMax}
          counterText={(length, max) =>
            t('publicReport.counter', { length: String(length), max: String(max) })
          }
          error={errors.note?.message}
          {...register(DISMISSAL_NOTE_FIELD)}
        />
        <div className={cn(styles.actions)}>
          <Button type="submit">
            {isSaving ? t('incidents.saving') : t('incidents.dismissConfirm')}
          </Button>
          <Button onClick={onCancel}>{t('incidents.cancel')}</Button>
        </div>
      </FormFields>
    </form>
  );
}
