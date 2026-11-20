import { useCallback, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { CircleCheck, Minus, Plus } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import type { DecimalRule } from '../../core/forms/FormSchemaBuilder';
import { FIELD, readingEntrySchema } from '../../core/forms/formSchemas';
import { formatDecimal, parseDecimalInput, toInputText } from '../../core/format/decimal';
import { toBogotaDateKey } from '../../core/format/time';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { gaugeDecimals } from '../../core/rules/bandCoverage';
import type { Gauge } from '../../core/rules/ruleSetParts';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import type { TankView } from '../../services/api/views';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Card } from '../../ui/cards/Card';
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
import { GaugeRuler } from './GaugeRuler';
import type { RulerBand } from './GaugeRuler';
import { resolveGauge } from './gaugeRule';

const GAUGE_DISPLAY_DIGITS = 2;
const STEP_COUNT = 3;
const NO_BANDS: readonly RulerBand[] = [];
const PERCENT = 100;
const WHOLE = 0;
const LAST = 1;

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
    setValue,
    formState,
  } = useForm<ReadingFormValues, unknown, ReadingFormOutput>({
    resolver: formResolver<ReadingFormValues, ReadingFormOutput>(schema),
    mode: 'onSubmit',
    defaultValues: { gauge_value: '', water_appearance_code: '', damage_noticed: false, note: '' },
  });
  const typedNote = useWatch({ control, name: FIELD.note });
  const typedGauge = useWatch({ control, name: FIELD.gaugeValue });
  // The number typed in the field is the source of truth; the ruler and the buttons only follow it.
  const typedLevel = parseDecimalInput(typedGauge);
  const gauge = resolveGauge(ruleSet.data?.gauge, tank);
  const bands =
    ruleSet.data?.bands.map((item) => ({
      code: item.band,
      from: item.minLevel,
      to: item.maxLevel,
    })) ?? NO_BANDS;
  const reserveLevel = ruleSet.data?.reserveLevel ?? null;
  const sliderDecimals = gauge === null ? 0 : gaugeDecimals(gauge);
  /** The slider moves the field, with the same text the person would type. Nothing else writes it. */
  const moveSlider = (value: number) => {
    setValue(FIELD.gaugeValue, toInputText(Number(value.toFixed(sliderDecimals))), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  /** One step up or down from what is typed; from an empty field it starts at the lowest mark. */
  const nudge = (delta: number) => {
    if (gauge !== null) {
      const from = typedLevel ?? gauge.min - delta;
      moveSlider(Math.min(gauge.max, Math.max(gauge.min, from + delta)));
    }
  };
  const stepText = gauge === null ? '' : formatDecimal(gauge.step, sliderDecimals);
  const meaning = levelMeaning(typedLevel, gauge, bands);
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
      <Card
        variant="tinted"
        tint="mint"
        as="section"
        className={cn(styles.confirmation)}
        role="status"
        aria-labelledby="reading-saved"
      >
        <div className={cn(styles.confirmationHead)}>
          <span className={cn(styles.confirmationIcon)}>
            <CircleCheck aria-hidden="true" />
          </span>
          <h2 id="reading-saved">{t('readings.savedTitle')}</h2>
        </div>
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
      </Card>
    );
  }

  const options = (appearances.data ?? []).map((item) => ({
    value: item.code,
    label: item.label,
  }));
  return (
    <form
      className={cn(styles.readingForm)}
      onSubmit={(event) => void submit(event)}
      noValidate
      aria-busy={isSubmitting}
    >
      <FormFields disabled={isSubmitting}>
        {saveFailed ? <FormAlert message={t('readings.serverError')} /> : null}
        <Card variant="tinted" tint="aqua" className={cn(styles.step)}>
          <StepHead step={1} />
          <div className={cn(styles.levelRow)}>
            <div className={cn(styles.levelField)}>
              <TextField
                label={t('readings.gaugeLabel')}
                hint={t('readings.gaugeHint', {
                  min: formatDecimal(tank.gaugeMin, GAUGE_DISPLAY_DIGITS),
                  max: formatDecimal(tank.gaugeMax, GAUGE_DISPLAY_DIGITS),
                })}
                inputMode="decimal"
                autoComplete="off"
                placeholder={formatDecimal(tank.gaugeMin, sliderDecimals)}
                error={errors.gauge_value?.message}
                className={cn(styles.gaugeInput)}
                {...register(FIELD.gaugeValue)}
              />
              {gauge === null ? null : (
                <div className={cn(styles.nudges)}>
                  <Button
                    className={cn(styles.nudge)}
                    aria-label={t('readings.nudgeDown', { step: stepText })}
                    disabled={typedLevel !== null && typedLevel <= gauge.min}
                    onClick={() => {
                      nudge(-gauge.step);
                    }}
                  >
                    <Minus aria-hidden="true" />
                    <span className={cn(styles.nudgeText)}>{t('readings.nudgeDownShort')}</span>
                  </Button>
                  <Button
                    className={cn(styles.nudge)}
                    aria-label={t('readings.nudgeUp', { step: stepText })}
                    disabled={typedLevel !== null && typedLevel >= gauge.max}
                    onClick={() => {
                      nudge(gauge.step);
                    }}
                  >
                    <Plus aria-hidden="true" />
                    <span className={cn(styles.nudgeText)}>{t('readings.nudgeUpShort')}</span>
                  </Button>
                </div>
              )}
            </div>
            {gauge === null ? null : (
              <div className={cn(styles.levelRuler)}>
                <GaugeRuler
                  gauge={gauge}
                  level={typedLevel}
                  decimals={sliderDecimals}
                  bands={bands}
                  reserveLevel={reserveLevel}
                  onChange={moveSlider}
                />
              </div>
            )}
            <p className={cn(styles.meaning)} aria-live="polite" data-warn={meaning.warn}>
              {meaning.text}
            </p>
          </div>
        </Card>
        <Card className={cn(styles.step)}>
          <StepHead step={2} />
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
        </Card>
        <Card className={cn(styles.step)}>
          <StepHead step={3} />
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
        </Card>
        <div className={cn(styles.actions)}>
          <Button type="submit" variant="primary" className={cn(styles.submit)}>
            {isSubmitting ? t('readings.submitting') : t('readings.submit')}
          </Button>
        </div>
      </FormFields>
    </form>
  );
}

function StepHead({ step }: { readonly step: number }): JSX.Element {
  return (
    <p className={cn(styles.stepHead)}>
      <span className={cn(styles.stepNumber)} aria-hidden="true">
        {step}
      </span>
      {t('readings.step', { n: String(step), total: String(STEP_COUNT) })}
    </p>
  );
}

/**
 * What the typed level means, said while the person types: the zone of the rule set and how full
 * the tank is, or that the number is off the ruler. It catches a slip of the finger before saving.
 */
function levelMeaning(
  level: number | null,
  gauge: Gauge | null,
  bands: readonly RulerBand[],
): { readonly text: string; readonly warn: boolean } {
  if (level === null || gauge === null) {
    return { text: t('readings.meaningEmpty'), warn: false };
  }
  if (level < gauge.min || level > gauge.max) {
    return {
      text: t('readings.meaningOutside', {
        min: formatDecimal(gauge.min, GAUGE_DISPLAY_DIGITS),
        max: formatDecimal(gauge.max, GAUGE_DISPLAY_DIGITS),
      }),
      warn: true,
    };
  }
  const percent = formatDecimal(((level - gauge.min) / (gauge.max - gauge.min)) * PERCENT, WHOLE);
  const band =
    bands.find((item) => level >= item.from && level < item.to) ?? bands[bands.length - LAST];
  return {
    text:
      band === undefined
        ? t('readings.meaningNoBand', { percent })
        : t('readings.meaning', { band: bandLabel(band.code), percent }),
    warn: false,
  };
}
