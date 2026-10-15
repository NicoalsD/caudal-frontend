import type { JSX } from 'react';

import { formatDecimal } from '../../core/format/decimal';
import { formatSignedPercent } from '../../core/evaluation/forecastEvaluation';
import { t } from '../../i18n/t';
import type { ForecastEvaluationView } from '../../services/api/views';
import { cn } from '../../ui/styles/cn';
import styles from './EvaluationPage.module.css';
import { horizonLabel } from './horizonLabel';

const METRIC_FRACTION_DIGITS = 2;
/** Each side of the track (negative left, positive right) is half of it. */
const HALF_TRACK_PERCENT = 50;
/** A skill of this size fills a whole side; bigger values are capped to it. */
const FULL_SKILL = 1;
/** Skill, and the two errors: the cells a horizon without evidence does not fill. */
const COLUMNS_WITH_EVIDENCE = 3;

interface HorizonSkillTableProps {
  readonly evaluations: readonly ForecastEvaluationView[];
}

/**
 * Skill per horizon against the simple estimate (S23). The table is the text alternative; the bar
 * repeats the sign with its side (right: the AI is better) and is hidden from assistive technology.
 */
export function HorizonSkillTable({ evaluations }: HorizonSkillTableProps): JSX.Element {
  return (
    <table className={cn(styles.table)}>
      <caption>{t('evaluation.skillCaption')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('evaluation.horizonColumn')}</th>
          <th scope="col">{t('evaluation.skillColumn')}</th>
          <th scope="col">{t('evaluation.maeIaColumn')}</th>
          <th scope="col">{t('evaluation.maeSimpleColumn')}</th>
        </tr>
      </thead>
      <tbody>
        {evaluations.map((evaluation) => (
          <tr key={evaluation.horizonDays}>
            <th scope="row">{horizonLabel(evaluation.horizonDays)}</th>
            {evaluation.helps === null ? (
              <td colSpan={COLUMNS_WITH_EVIDENCE}>
                {t('evaluation.evaluatedCount', { count: evaluation.n })}
              </td>
            ) : (
              <>
                <td>
                  {evaluation.skill === null ? (
                    t('evaluation.noValue')
                  ) : (
                    <SkillBar skill={evaluation.skill} />
                  )}
                </td>
                <td>{meters(evaluation.maeIa)}</td>
                <td>{meters(evaluation.maeSimple)}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SkillBar({ skill }: { readonly skill: number }): JSX.Element {
  const width = Math.min(Math.abs(skill) / FULL_SKILL, 1) * HALF_TRACK_PERCENT;
  return (
    <span className={cn(styles.skill)}>
      <span>{formatSignedPercent(skill)}</span>
      <span aria-hidden="true" className={cn(styles.track)}>
        <span
          className={cn(skill >= 0 ? styles.barBetter : styles.barWorse)}
          style={{ width: `${width}%` }}
        />
      </span>
    </span>
  );
}

function meters(value: number | null): string {
  return value === null
    ? t('evaluation.noValue')
    : t('evaluation.meters', { value: formatDecimal(value, METRIC_FRACTION_DIGITS) });
}
