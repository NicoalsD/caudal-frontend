import { useRef, useState } from 'react';
import type { JSX } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { ALL_DAYS_VALUE } from '../../core/forms/FormSchemaBuilder';
import type { DraftFormOutput, DraftFormValues } from '../../core/rules/draftForm';
import { t } from '../../i18n/t';
import { Button } from '../../ui/primitives/Button';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './Rules.module.css';
import { dayLabel } from './ruleLabels';

/** The groups of the editor, in order: every day, then Monday (1) to Sunday (7). */
const DAY_VALUES = [ALL_DAYS_VALUE, '1', '2', '3', '4', '5', '6', '7'] as const;

function dayOfValue(value: string): number | null {
  return value === ALL_DAYS_VALUE ? null : Number(value);
}

/**
 * Section "Horario de operación": the windows of each day, with start and end times. Windows are
 * added and removed per day; the checks (end after start, no crossing, optional maximum) are the
 * schema's, the same that block the save.
 */
export function WindowsEditor(): JSX.Element {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<DraftFormValues, unknown, DraftFormOutput>();
  const { fields, append, remove } = useFieldArray({ control, name: 'windows' });
  const [announcement, setAnnouncement] = useState('');
  const addButtons = useRef(new Map<string, HTMLButtonElement>());
  const rootError = errors.windows?.root?.message ?? errors.windows?.message;

  return (
    <section className={cn(styles.section)} aria-labelledby="rules-edit-windows-title">
      <h2 id="rules-edit-windows-title">{t('rules.editWindowsTitle')}</h2>
      <p className={cn(styles.note)}>{t('rules.editWindowsIntro')}</p>
      {DAY_VALUES.map((day) => {
        const dayName = dayLabel(dayOfValue(day));
        const rows = fields
          .map((field, index) => ({ field, index }))
          .filter(({ field }) => field.day === day);
        return (
          <fieldset key={day} className={cn(styles.dayGroup)}>
            <legend>{dayName}</legend>
            {rows.length === 0 ? (
              <p className={cn(styles.note)}>{t('rules.noWindowsForDay')}</p>
            ) : null}
            {rows.map(({ field, index }) => (
              <div key={field.id} className={cn(styles.windowRow)}>
                <TextField
                  label={t('rules.windowStart')}
                  type="time"
                  error={errors.windows?.[index]?.start_time?.message}
                  {...register(`windows.${index}.start_time`)}
                />
                <TextField
                  label={t('rules.windowEnd')}
                  type="time"
                  error={errors.windows?.[index]?.end_time?.message}
                  {...register(`windows.${index}.end_time`)}
                />
                <Button
                  onClick={() => {
                    remove(index);
                    setAnnouncement(t('rules.windowRemoved', { day: dayName }));
                    addButtons.current.get(day)?.focus();
                  }}
                >
                  {`${t('rules.removeWindow')}: ${dayName}`}
                </Button>
              </div>
            ))}
            <div>
              <Button
                ref={(element) => {
                  if (element === null) {
                    addButtons.current.delete(day);
                  } else {
                    addButtons.current.set(day, element);
                  }
                }}
                onClick={() => {
                  append({ day, start_time: '', end_time: '' });
                }}
              >
                {`${t('rules.addWindow')}: ${dayName}`}
              </Button>
            </div>
          </fieldset>
        );
      })}
      {rootError === undefined ? null : (
        <p role="alert" className={cn(styles.rootError)}>
          {rootError}
        </p>
      )}
      <p role="status" className={cn(styles.note)}>
        {announcement}
      </p>
    </section>
  );
}
