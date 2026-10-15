import type { JSX } from 'react';

import { formatDecimal } from '../../core/format/decimal';
import { formatPercent } from '../../core/evaluation/forecastEvaluation';
import { t } from '../../i18n/t';
import type { ForecastEvaluationView } from '../../services/api/views';
import { cn } from '../../ui/styles/cn';
import styles from './EvaluationPage.module.css';

/** Two-decimal meters, the precision of the levels (decimal comma). */
const METRIC_FRACTION_DIGITS = 2;

interface EvaluationMetricsProps {
  readonly evaluation: ForecastEvaluationView;
}

/** The metrics of one horizon: the AI and the simple estimate side by side (S23). */
export function EvaluationMetrics({ evaluation }: EvaluationMetricsProps): JSX.Element {
  return (
    <ul className={cn(styles.metrics)}>
      <li className={cn(styles.metric)}>
        <h3 className={cn(styles.metricTitle)}>{t('evaluation.maeTitle')}</h3>
        <p className={cn(styles.explanation)}>{t('evaluation.maeExplanation')}</p>
        <dl className={cn(styles.values)}>
          <dt>{t('evaluation.ia')}</dt>
          <dd>{meters(evaluation.maeIa)}</dd>
          <dt>{t('evaluation.simple')}</dt>
          <dd>{meters(evaluation.maeSimple)}</dd>
        </dl>
      </li>
      <li className={cn(styles.metric)}>
        <h3 className={cn(styles.metricTitle)}>{t('evaluation.wqlTitle')}</h3>
        <p className={cn(styles.explanation)}>{t('evaluation.wqlExplanation')}</p>
        <dl className={cn(styles.values)}>
          <dt>{t('evaluation.ia')}</dt>
          <dd>{decimalOrNoValue(evaluation.wqlIa)}</dd>
          <dt>{t('evaluation.simple')}</dt>
          <dd>{t('evaluation.notApplicable')}</dd>
        </dl>
      </li>
      <li className={cn(styles.metric)}>
        <h3 className={cn(styles.metricTitle)}>{t('evaluation.coverageTitle')}</h3>
        <p className={cn(styles.explanation)}>{t('evaluation.coverageExplanation')}</p>
        <dl className={cn(styles.values)}>
          <dt>{t('evaluation.ia')}</dt>
          <dd>
            {evaluation.coverage80 === null
              ? t('evaluation.noValue')
              : formatPercent(evaluation.coverage80)}
          </dd>
          <dt>{t('evaluation.simple')}</dt>
          <dd>{t('evaluation.notApplicable')}</dd>
        </dl>
      </li>
    </ul>
  );
}

function decimalOrNoValue(value: number | null): string {
  return value === null ? t('evaluation.noValue') : formatDecimal(value, METRIC_FRACTION_DIGITS);
}

function meters(value: number | null): string {
  return value === null
    ? t('evaluation.noValue')
    : t('evaluation.meters', { value: formatDecimal(value, METRIC_FRACTION_DIGITS) });
}
