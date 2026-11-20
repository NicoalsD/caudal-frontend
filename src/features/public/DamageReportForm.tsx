import { useEffect, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';
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
import { DamageCategoryField, DamageDetailsFields } from '../../ui/forms/DamageReportFields';
import { damageReportErrorMessage } from './damageReportErrors';
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
  /** Limits from /meta/constraints: the description needs the minimum and stops at the maximum. */
  readonly descriptionMin: number | undefined;
  readonly descriptionMax: number;
  readonly locationMax: number | undefined;
  /** Rejects with the server error; the form shows the text for it and keeps what was typed. */
  readonly onSubmit: (input: DamageReportInput) => Promise<void>;
}

type Step = 'choose' | 'details';

/** The report is two short steps: what happened, then the description and the place. */
const TOTAL_STEPS = 2;
const STEP_POSITION: Readonly<Record<Step, number>> = { choose: 1, details: 2 };

/**
 * Damage report form (S05), in two steps. The first step asks what happened and cannot go on
 * without an answer; the second describes it and sends. The honeypot field is hidden from people
 * and from assistive technology with the `hidden` attribute: only a bot fills it, and then the
 * server answers as if the report were saved, without saving it (API.md 15.4).
 */
export function DamageReportForm({
  schema,
  categories,
  descriptionMin,
  descriptionMax,
  locationMax,
  onSubmit,
}: DamageReportFormProps): JSX.Element {
  // The minimum filling time counts from when the form was opened, not from the last render.
  const [formStartedAt] = useState(() => new Date().toISOString());
  const [failure, setFailure] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('choose');
  const [hasMoved, setHasMoved] = useState(false);
  const { register, handleSubmit, control, formState } = useForm<DamageReportValues>({
    resolver: formResolver<DamageReportValues>(schema),
    mode: 'onChange',
    defaultValues: { category_code: '', description: '', location_hint: '', website: '' },
  });
  const { errors, isSubmitting, isValid } = formState;
  const category = useWatch({ control, name: DAMAGE_REPORT_FIELD.categoryCode }) ?? '';
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

  const goTo = (next: Step): void => {
    setHasMoved(true);
    setStep(next);
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        <p className={cn(styles.progress)}>
          {t('publicReport.stepProgress', {
            current: String(STEP_POSITION[step]),
            total: String(TOTAL_STEPS),
          })}
        </p>
        {step === 'choose' ? (
          <ChooseStep
            focusOnMount={hasMoved}
            canContinue={category !== ''}
            onNext={() => goTo('details')}
          >
            <DamageCategoryField
              categories={categoryOptions}
              error={errors.category_code?.message}
              categoryField={register(DAMAGE_REPORT_FIELD.categoryCode)}
            />
          </ChooseStep>
        ) : (
          <DetailsStep
            isValid={isValid}
            isSubmitting={isSubmitting}
            failure={failure}
            onBack={() => goTo('choose')}
          >
            <DamageDetailsFields
              descriptionMin={descriptionMin}
              descriptionMax={descriptionMax}
              locationMax={locationMax}
              description={description}
              errors={{
                description: errors.description?.message,
                location: errors.location_hint?.message,
              }}
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
          </DetailsStep>
        )}
      </FormFields>
    </form>
  );
}

/** A step heading. It takes focus when the step is entered, so the change is read aloud. */
function StepHeading({
  children,
  focus,
}: {
  readonly children: string;
  readonly focus: boolean;
}): JSX.Element {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) {
      ref.current?.focus();
    }
  }, [focus]);
  return (
    <h2 ref={ref} tabIndex={-1} className={cn(styles.stepHeading)}>
      {children}
    </h2>
  );
}

function ChooseStep({
  focusOnMount,
  canContinue,
  onNext,
  children,
}: {
  readonly focusOnMount: boolean;
  readonly canContinue: boolean;
  readonly onNext: () => void;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <>
      <StepHeading focus={focusOnMount}>{t('publicReport.stepChooseTitle')}</StepHeading>
      {children}
      <div className={cn(styles.stepActions)}>
        {canContinue ? null : (
          <p className={cn(styles.submitHint)}>{t('publicReport.chooseFirst')}</p>
        )}
        <Button variant="primary" onClick={onNext} disabled={!canContinue}>
          {t('publicReport.next')}
        </Button>
      </div>
    </>
  );
}

function DetailsStep({
  isValid,
  isSubmitting,
  failure,
  onBack,
  children,
}: {
  readonly isValid: boolean;
  readonly isSubmitting: boolean;
  readonly failure: string | null;
  readonly onBack: () => void;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <>
      <StepHeading focus>{t('publicReport.stepDetailsTitle')}</StepHeading>
      {failure === null ? null : <FormAlert message={failure} />}
      {children}
      <div className={cn(styles.stepActions)}>
        <Button onClick={onBack}>{t('publicReport.changeCategory')}</Button>
        {isValid || isSubmitting ? null : (
          <p className={cn(styles.submitHint)}>{t('publicReport.submitHint')}</p>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || isSubmitting}
          className={cn(styles.submit)}
        >
          {isSubmitting ? t('publicReport.sending') : t('publicReport.submit')}
        </Button>
      </div>
    </>
  );
}
