import { useCallback, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import type { DecimalRule } from '../../core/forms/FormSchemaBuilder';
import { FIELD, readingEntrySchema } from '../../core/forms/formSchemas';
import { formatDecimal, toInputText } from '../../core/format/decimal';
import { toBogotaDateKey } from '../../core/format/time';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { gaugeDecimals } from '../../core/rules/bandCoverage';
import { t } from '../../i18n/t';
import type { TankView } from '../../services/api/views';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { ROUTE_PATHS } from '../../core/session/routes';
import { CheckboxField } from '../../ui/primitives/CheckboxField';
import { formResolver } from '../../ui/primitives/formResolver';
import { FormFields } from '../../ui/primitives/FormFields';
import { RadioGroupField } from '../../ui/primitives/RadioGroupField';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './Readings.module.css';
import { useSaveReading, useWaterAppearances } from './readingQueries';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';

const GAUGE_DISPLAY_DIGITS = 2;

interface ReadingFormValues {
  gauge_value: string;
  water_appearance_code: string;
  damage_noticed: boolean;
  note: string;
}

interface ReadingFormOutput {
  gauge_value: number;
  water_appearance_code: string;
  damage_noticed: boolean;
  note: string;
}

interface ReadingFormProps {
  readonly tank: TankView;
}

/** The note keeps the limits of `reading.note`; the maximum feeds the character counter. */
function buildForm(rule: DecimalRule) {
  return (constraints: ConstraintsMap, messages: ValidationMessageFactory) => ({
    schema: readingEntrySchema(constraints, rule, messages),
    noteMax: constraints[FIELD.readingNote]?.max ?? 0,
  });
}

/**
 * Screen S02: the plumber types the level of the painted ruler, how the water looks and an
 * optional note. The range is the one of the tank; the limits come from /meta/constraints.
 */
export function ReadingForm({ tank }: ReadingFormProps): JSX.Element {
  // The Junta's gauge range (cached for offline use) wins; the tank's own range is the fallback.
  const ruleSet = useCurrentRuleSet();
  const gauge = ruleSet.data?.gauge ?? {
    min: tank.gaugeMin,
    max: tank.gaugeMax,
    step: tank.gaugeStep,
  };
  const rule = useMemo<DecimalRule>(
    () => ({
      min: gauge.min,
      max: gauge.max,
      decimals: gaugeDecimals({ min: gauge.min, max: gauge.max, step: gauge.step }),
    }),
    [gauge.min, gauge.max, gauge.step],
  );
  const build = useCallback(
    (constraints: ConstraintsMap, messages: ValidationMessageFactory) =>
      buildForm(rule)(constraints, messages),
    [rule],
  );
  const form = useFormSchema(build);

  if (form.status === 'loading') {
    return <LoadingState message={t('auth.loadingForm')} />;
  }
  if (form.status === 'unavailable') {
    return (
      <ErrorState title={t('screens.newReading')} message={t('connection.constraintsMissing')} />
    );
  }
  if (form.status === 'misconfigured') {
    return <ErrorState title={t('screens.newReading')} message={t('errors.configMissing')} />;
  }
  return <ReadingFields tank={tank} schema={form.schema.schema} noteMax={form.schema.noteMax} />;
}

interface ReadingFieldsProps {
  readonly tank: TankView;
  readonly schema: ReturnType<typeof readingEntrySchema>;
  readonly noteMax: number;
}

function ReadingFields({ tank, schema, noteMax }: ReadingFieldsProps): JSX.Element {
  const appearances = useWaterAppearances();
  const ruleSet = useCurrentRuleSet();
  const offline = useOfflineServices();
  const save = useSaveReading();
  const [saveFailed, setSaveFailed] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [saved, setSaved] = useState<{ value: number; sendingNow: boolean } | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset: resetForm,
    formState,
  } = useForm<ReadingFormValues, unknown, ReadingFormOutput>({
    resolver: formResolver<ReadingFormValues, ReadingFormOutput>(schema),
    mode: 'onSubmit',
    defaultValues: { gauge_value: '', water_appearance_code: '', damage_noticed: false, note: '' },
  });
  const typedNote = useWatch({ control, name: FIELD.note });
  const { errors, isSubmitting } = formState;
  // The optional fields open on their own when they hold an error, so the error is never hidden.
  const showOptional = optionalOpen || errors.note !== undefined;
  const closeToday = ROUTE_PATHS.operator.dayClosure.replace(
    ':date',
    toBogotaDateKey(new Date(offline.clock.nowMs()).toISOString()),
  );

  const submit = handleSubmit(async (values) => {
    setSaveFailed(false);
    try {
      const result = await save.mutateAsync({
        tankId: tank.id,
        gaugeValue: values.gauge_value,
        waterAppearanceCode: values.water_appearance_code,
        damageNoticed: values.damage_noticed,
        note: values.note,
        ruleSetVersionId: ruleSet.data?.id ?? null,
      });
      setSaved({ value: values.gauge_value, sendingNow: result.sendingNow });
    } catch {
      setSaveFailed(true);
    }
  });

  if (saved !== null) {
    return (
      <section className={cn(styles.confirmation)} role="status" aria-labelledby="reading-saved">
        <h2 id="reading-saved">{t('readings.savedTitle')}</h2>
        <p>{saved.sendingNow ? t('readings.savedQueued') : t('readings.savedOffline')}</p>
        <p className={cn(styles.savedValue)}>
          {t('readings.savedValue', { value: formatDecimal(saved.value, GAUGE_DISPLAY_DIGITS) })}
        </p>
        <h3 className={cn(styles.nextTitle)}>{t('readings.savedNext')}</h3>
        <div className={cn(styles.actions)}>
          {saved.sendingNow ? (
            <LinkButton variant="primary" to={closeToday}>
              {t('home.closeDay')}
            </LinkButton>
          ) : (
            <LinkButton variant="primary" to={ROUTE_PATHS.operator.pending}>
              {t('readings.savedSeePending')}
            </LinkButton>
          )}
          <Button
            onClick={() => {
              resetForm();
              setSaved(null);
            }}
          >
            {t('readings.another')}
          </Button>
          {saved.sendingNow ? (
            <LinkButton to={ROUTE_PATHS.operator.pending}>
              {t('readings.savedSeePending')}
            </LinkButton>
          ) : (
            <LinkButton to={closeToday}>{t('home.closeDay')}</LinkButton>
          )}
        </div>
      </section>
    );
  }

  const options = (appearances.data ?? []).map((item) => ({
    value: item.code,
    label: item.label,
  }));
  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
      <FormFields disabled={isSubmitting}>
        {saveFailed ? <FormAlert message={t('readings.serverError')} /> : null}
        <TextField
          label={t('readings.gaugeLabel')}
          hint={t('readings.gaugeHint', {
            min: formatDecimal(tank.gaugeMin, GAUGE_DISPLAY_DIGITS),
            max: formatDecimal(tank.gaugeMax, GAUGE_DISPLAY_DIGITS),
          })}
          inputMode="decimal"
          autoComplete="off"
          placeholder={toInputText(tank.gaugeMin)}
          error={errors.gauge_value?.message}
          className={cn(styles.gaugeInput)}
          {...register(FIELD.gaugeValue)}
        />
        {appearances.isError ? (
          <FormAlert message={t('readings.appearanceLoadError')} />
        ) : (
          <RadioGroupField
            legend={t('readings.appearanceLegend')}
            options={options}
            error={errors.water_appearance_code?.message}
            {...register(FIELD.waterAppearance)}
          />
        )}
        <details
          className={cn(styles.optional)}
          open={showOptional}
          onToggle={(event) => {
            setOptionalOpen(event.currentTarget.open);
          }}
        >
          <summary className={cn(styles.summary)}>{t('readings.optionalSummary')}</summary>
          <div className={cn(styles.optionalBody)}>
            <CheckboxField label={t('readings.damageLabel')} {...register(FIELD.damageNoticed)} />
            <TextAreaField
              label={t('readings.noteLabel')}
              hint={t('readings.noteHint')}
              length={typedNote.length}
              maxLength={noteMax}
              counterText={(length, max) =>
                t('readings.noteCounter', { length: String(length), max: String(max) })
              }
              error={errors.note?.message}
              {...register(FIELD.note)}
            />
          </div>
        </details>
        <div className={cn(styles.actions)}>
          <Button type="submit" variant="primary" className={cn(styles.submit)}>
            {isSubmitting ? t('readings.submitting') : t('readings.submit')}
          </Button>
        </div>
      </FormFields>
    </form>
  );
}
