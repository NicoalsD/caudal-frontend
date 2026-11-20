import type { JSX } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { CircleCheck, Circle } from 'lucide-react';

import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import formStyles from './DamageReportFields.module.css';
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

export interface DamageCategoryFieldProps {
  /** The damage categories, with their Spanish labels (the form maps the catalog to these). */
  readonly categories: readonly RadioOption[];
  readonly error?: string | undefined;
  readonly categoryField: UseFormRegisterReturn;
}

/** "What happened": one big radio per category. Shared by the public and the signed-in reports. */
export function DamageCategoryField({
  categories,
  error,
  categoryField,
}: DamageCategoryFieldProps): JSX.Element {
  return (
    <RadioGroupField
      legend={t('publicReport.categoryLegend')}
      options={categories}
      error={error}
      {...categoryField}
    />
  );
}

export interface DamageDetailsFieldsProps {
  /** Minimum length of the description (from /meta/constraints), shown as a requirement. */
  readonly descriptionMin?: number | undefined;
  /** Limits from /meta/constraints: the field stops at the maximum and the counter shows it. */
  readonly descriptionMax: number;
  readonly locationMax: number | undefined;
  /** The description as typed so far, for the counter and the requirement. */
  readonly description: string;
  readonly errors: Pick<DamageReportFieldErrors, 'description' | 'location'>;
  readonly descriptionField: UseFormRegisterReturn;
  readonly locationField: UseFormRegisterReturn;
}

/**
 * "What it looks like and where": the description and the place. The requirement of the
 * description turns into a check mark when it is met, so the person sees progress as they type.
 */
export function DamageDetailsFields({
  descriptionMin,
  descriptionMax,
  locationMax,
  description,
  errors,
  descriptionField,
  locationField,
}: DamageDetailsFieldsProps): JSX.Element {
  const minimum = descriptionMin ?? 0;
  const minimumMet = description.trim().length >= minimum;
  return (
    <>
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
      {minimum > 0 ? (
        <p className={cn(formStyles.requirement, minimumMet && formStyles.requirementMet)}>
          {minimumMet ? (
            <CircleCheck aria-hidden="true" className={cn(formStyles.icon)} />
          ) : (
            <Circle aria-hidden="true" className={cn(formStyles.icon)} />
          )}
          <span>{t('publicReport.minimumLength', { min: String(minimum) })}</span>
        </p>
      ) : null}
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

export interface DamageReportFieldsProps
  extends Omit<DamageCategoryFieldProps, 'error'>, Omit<DamageDetailsFieldsProps, 'errors'> {
  readonly errors: DamageReportFieldErrors;
}

/**
 * The fields shared by the public damage report (S05) and the signed-in one (S11): what happened
 * and where. The form that uses them owns the state, the steps and the submit.
 */
export function DamageReportFields({
  categories,
  descriptionMin,
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
      <DamageCategoryField
        categories={categories}
        error={errors.category}
        categoryField={categoryField}
      />
      <DamageDetailsFields
        descriptionMin={descriptionMin}
        descriptionMax={descriptionMax}
        locationMax={locationMax}
        description={description}
        errors={errors}
        descriptionField={descriptionField}
        locationField={locationField}
      />
    </>
  );
}
