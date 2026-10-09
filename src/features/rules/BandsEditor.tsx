import type { JSX } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { parseDecimalInput } from '../../core/format/decimal';
import type { DraftFormOutput, DraftFormValues } from '../../core/rules/draftForm';
import { analyzeBands, gaugeDecimals } from '../../core/rules/bandCoverage';
import type { BandAnalysis, BandRange } from '../../core/rules/bandCoverage';
import type { Gauge } from '../../core/rules/ruleSetParts';
import { isBandCode } from '../../core/rules/ruleSetParts';
import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';
import { validationMessages } from '../../i18n/validationMessages';
import { CheckboxField } from '../../ui/primitives/CheckboxField';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './Rules.module.css';
import { bandLabel } from './ruleLabels';

interface BandsEditorProps {
  readonly gauge: Gauge;
}

function problemMessages(analysis: BandAnalysis): string[] {
  return [
    ...analysis.inverted.map(() => validationMessages('bandOrder', {})),
    ...analysis.overlaps.map((span) =>
      validationMessages('bandOverlap', { from: span.from, to: span.to }),
    ),
    ...analysis.gaps.map((span) => validationMessages('bandGap', { from: span.from, to: span.to })),
  ];
}

/** The rows that already hold two readable numbers; the rest are reported by their own field. */
function readableRanges(rows: DraftFormValues['bands']): BandRange[] {
  return rows.flatMap((row) => {
    const minLevel = parseDecimalInput(row.min_level);
    const maxLevel = parseDecimalInput(row.max_level);
    return minLevel === null || maxLevel === null ? [] : [{ minLevel, maxLevel }];
  });
}

/**
 * Section "Bandas de nivel" of the draft form. It lists the problems of the whole set as the
 * person types ("Entre 3,5 y 3,6 no hay banda"); the same checks block the save (the schema).
 */
export function BandsEditor({ gauge }: BandsEditorProps): JSX.Element {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<DraftFormValues, unknown, DraftFormOutput>();
  const rows = useWatch({ control, name: 'bands' });
  const problems = problemMessages(analyzeBands(readableRanges(rows), gauge, gaugeDecimals(gauge)));
  const digits = gaugeDecimals(gauge);

  return (
    <section className={cn(styles.section)} aria-labelledby="rules-edit-bands-title">
      <h2 id="rules-edit-bands-title">{t('rules.editBandsTitle')}</h2>
      <p>
        {t('rules.gaugeRange', {
          min: formatDecimal(gauge.min, digits),
          max: formatDecimal(gauge.max, digits),
        })}
      </p>
      <p className={cn(styles.note)}>{t('rules.editBandsIntro')}</p>
      <div className={cn(styles.tableWrap)}>
        <table className={cn(styles.table)}>
          <caption>{t('rules.bandsCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('rules.bandName')}</th>
              <th scope="col">{t('rules.bandFrom')}</th>
              <th scope="col">{t('rules.bandTo')}</th>
              <th scope="col">{t('rules.bandHours')}</th>
              <th scope="col">{t('rules.bandPriorityOnly')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const name = isBandCode(row.band) ? bandLabel(row.band) : row.band;
              const rowErrors = errors.bands?.[index];
              return (
                <tr key={row.band}>
                  <th scope="row">{name}</th>
                  <td>
                    <TextField
                      label={`${name}: ${t('rules.bandFromField')}`}
                      hideLabel
                      inputMode="decimal"
                      autoComplete="off"
                      className={cn(styles.cellInput)}
                      error={rowErrors?.min_level?.message}
                      {...register(`bands.${index}.min_level`)}
                    />
                  </td>
                  <td>
                    <TextField
                      label={`${name}: ${t('rules.bandToField')}`}
                      hideLabel
                      inputMode="decimal"
                      autoComplete="off"
                      className={cn(styles.cellInput)}
                      error={rowErrors?.max_level?.message}
                      {...register(`bands.${index}.max_level`)}
                    />
                  </td>
                  <td>
                    <TextField
                      label={`${name}: ${t('rules.bandHoursField')}`}
                      hideLabel
                      inputMode="decimal"
                      autoComplete="off"
                      className={cn(styles.cellInput)}
                      error={rowErrors?.daily_service_hours?.message}
                      {...register(`bands.${index}.daily_service_hours`)}
                    />
                  </td>
                  <td>
                    <CheckboxField
                      label={t('rules.bandPriorityOnly')}
                      {...register(`bands.${index}.priority_only`)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div aria-live="polite">
        {problems.length === 0 ? null : (
          <div className={cn(styles.problems)}>
            <p className={cn(styles.problemsTitle)}>{t('rules.bandProblemsTitle')}</p>
            <ul>
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
