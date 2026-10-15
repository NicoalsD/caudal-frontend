import { useState } from 'react';
import type { JSX } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { damageReportFormSchema } from '../../core/forms/formSchemas';
import { DAMAGE_REPORT_FIELD } from '../../core/forms/formSchemas';
import { t } from '../../i18n/t';
import type { CatalogOptionView, DamageReportInput } from '../../services/api/views';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { FormFields } from '../../ui/primitives/FormFields';
import { formResolver } from '../../ui/primitives/formResolver';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import { damageReportErrorMessage } from './damageReportErrors';
import { DamageReportFields } from '../../ui/forms/DamageReportFields';
import styles from './PublicSchedule.module.css';

interface DamageReportValues {
  readonly category_code: string;
  readonly description: string;
  readonly location_hint: string;
  readonly website: string;
}

interface DamageReportFormProps {
  readonly schema: ReturnType<typeof damageReportFormSchema>;
  readonly categories: readonly CatalogOptionView[];
  /** Limits from /meta/constraints: the field stops at the maximum and the counter shows it. */
  readonly descriptionMax: number;
  readonly locationMax: number | undefined;
  /** Rejects with the server error; the form shows the text for it and keeps what was typed. */
  readonly onSubmit: (input: DamageReportInput) => Promise<void>;
}

/**
 * Damage report form (S05). The honeypot field is hidden from people and from assistive
 * technology with the `hidden` attribute: only a bot fills it, and then the server answers as if
 * the report were saved, without saving it (API.md 15.4).
 */
export function DamageReportForm({
  schema,
  categories,
  descriptionMax,
  locationMax,
  onSubmit,
}: DamageReportFormProps): JSX.Element {
  // The minimum filling time counts from when the form was opened, not from the last render.
  const [formStartedAt] = useState(() => new Date().toISOString());
  const [failure, setFailure] = useState<string | null>(null);
  const { register, handleSubmit, control, formState } = useForm<DamageReportValues>({
    resolver: formResolver<DamageReportValues>(schema),
    mode: 'onChange',
    defaultValues: { category_code: '', description: '', location_hint: '', website: '' },
  });
  const { errors, isSubmitting, isValid } = formState;
  const description = useWatch({ control, name: DAMAGE_REPORT_FIELD.description }) ?? '';
  const categoryOptions = categories.map((category) => ({
    value: category.code,
    label: category.label,
  }));

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onSubmit({
        categoryCode: values.category_code,
        description: values.description,
        locationHint: values.location_hint,
        website: values.website,
        formStartedAt,
      });
    } catch (error) {
      setFailure(damageReportErrorMessage(error));
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {failure === null ? null : <FormAlert message={failure} />}
        <DamageReportFields
          categories={categoryOptions}
          descriptionMax={descriptionMax}
          locationMax={locationMax}
          description={description}
          errors={{
            category: errors.category_code?.message,
            description: errors.description?.message,
            location: errors.location_hint?.message,
          }}
          categoryField={register(DAMAGE_REPORT_FIELD.categoryCode)}
          descriptionField={register(DAMAGE_REPORT_FIELD.description)}
          locationField={register(DAMAGE_REPORT_FIELD.locationHint)}
        />
        <div hidden>
          <TextField
            label={t('publicReport.honeypotLabel')}
            autoComplete="off"
            tabIndex={-1}
            {...register(DAMAGE_REPORT_FIELD.website)}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || isSubmitting}
          className={cn(styles.submit)}
        >
          {isSubmitting ? t('publicReport.sending') : t('publicReport.submit')}
        </Button>
      </FormFields>
    </form>
  );
}
