import type { JSX } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { t } from '../../i18n/t';
import { RadioGroupField } from '../primitives/RadioGroupField';
import type { RadioOption } from '../primitives/RadioGroupField';
import { TextAreaField } from '../primitives/TextAreaField';
import { TextField } from '../primitives/TextField';

/** Messages to show under each field (already translated), when a field is wrong. */
export interface DamageReportFieldErrors {
  readonly category?: string | undefined;
  readonly description?: string | undefined;
  readonly location?: string | undefined;
}

export interface DamageReportFieldsProps {
  /** The damage categories, with their Spanish labels (the form maps the catalog to these). */
  readonly categories: readonly RadioOption[];
  /** Limits from /meta/constraints: the field stops at the maximum and the counter shows it. */
  readonly descriptionMax: number;
  readonly locationMax: number | undefined;
  /** The description as typed so far, for the counter. */
  readonly description: string;
  readonly errors: DamageReportFieldErrors;
  readonly categoryField: UseFormRegisterReturn;
  readonly descriptionField: UseFormRegisterReturn;
  readonly locationField: UseFormRegisterReturn;
}

/**
 * The fields shared by the public damage report (S05) and the signed-in one (S11): what happened
 * and where. The form that uses them owns the state, the submit and its own extra fields.
 */
export function DamageReportFields({
  categories,
  descriptionMax,
  locationMax,
  description,
  errors,
  categoryField,
  descriptionField,
  locationField,
}: DamageReportFieldsProps): JSX.Element {
  return (
    <>
      <RadioGroupField
        legend={t('publicReport.categoryLegend')}
        options={categories}
        error={errors.category}
        {...categoryField}
      />
      <TextAreaField
        label={t('publicReport.descriptionLabel')}
        hint={t('publicReport.descriptionHint')}
        length={description.length}
        maxLength={descriptionMax}
        counterText={(length, max) =>
          t('publicReport.counter', { length: String(length), max: String(max) })
        }
        error={errors.description}
        {...descriptionField}
      />
      <TextField
        label={t('publicReport.locationLabel')}
        hint={t('publicReport.locationHint')}
        maxLength={locationMax}
        autoComplete="off"
        error={errors.location}
        {...locationField}
      />
    </>
  );
}
