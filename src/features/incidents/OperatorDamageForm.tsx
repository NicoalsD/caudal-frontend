import { useState } from 'react';
import type { JSX } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { operatorDamageFormSchema } from '../../core/forms/formSchemas';
import { DAMAGE_REPORT_FIELD, OPERATOR_DAMAGE_SECTOR_FIELD } from '../../core/forms/formSchemas';
import { t } from '../../i18n/t';
import type { CatalogOptionView, IncidentInput, SectorView } from '../../services/api/views';
import { DamageReportFields } from '../../ui/forms/DamageReportFields';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { FormFields } from '../../ui/primitives/FormFields';
import { formResolver } from '../../ui/primitives/formResolver';
import { cn } from '../../ui/styles/cn';
import { operatorDamageErrorMessage } from './operatorDamageErrors';
import styles from './OperatorDamage.module.css';

/** The sector's value when the person does not know it: an empty text. */
const NO_SECTOR = '';

interface OperatorDamageValues {
  readonly category_code: string;
  readonly description: string;
  readonly location_hint: string;
  readonly sector_id: string;
}

interface OperatorDamageFormProps {
  readonly schema: ReturnType<typeof operatorDamageFormSchema>;
  readonly categories: readonly CatalogOptionView[];
  readonly sectors: readonly SectorView[];
  readonly descriptionMax: number;
  readonly locationMax: number | undefined;
  /** Rejects with the server or connection error: the form shows it and keeps what was typed. */
  readonly onSubmit: (input: IncidentInput) => Promise<void>;
}

/**
 * The signed-in damage report (S11). Same fields as the public form, plus the sector picker. No
 * honeypot: the API protects the signed-in route with the session, not with a trap field.
 */
export function OperatorDamageForm({
  schema,
  categories,
  sectors,
  descriptionMax,
  locationMax,
  onSubmit,
}: OperatorDamageFormProps): JSX.Element {
  const [failure, setFailure] = useState<string | null>(null);
  const { register, handleSubmit, control, formState } = useForm<OperatorDamageValues>({
    resolver: formResolver<OperatorDamageValues>(schema),
    mode: 'onChange',
    defaultValues: { category_code: '', description: '', location_hint: '', sector_id: NO_SECTOR },
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
        sectorId: values.sector_id === NO_SECTOR ? null : values.sector_id,
        locationHint: values.location_hint === '' ? null : values.location_hint,
      });
    } catch (error) {
      setFailure(operatorDamageErrorMessage(error));
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
        <label className={cn(styles.label)}>
          {t('operatorDamage.sectorLabel')}
          <select className={cn(styles.select)} {...register(OPERATOR_DAMAGE_SECTOR_FIELD)}>
            <option value={NO_SECTOR}>{t('operatorDamage.noSector')}</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || isSubmitting}
          className={cn(styles.submit)}
        >
          {isSubmitting ? t('operatorDamage.saving') : t('operatorDamage.submit')}
        </Button>
      </FormFields>
    </form>
  );
}
