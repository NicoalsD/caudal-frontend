import { useState } from 'react';
import type { JSX } from 'react';

import { aiVerdict, horizonsUpTo } from '../../core/evaluation/forecastEvaluation';
import type { AiVerdict } from '../../core/evaluation/forecastEvaluation';
import { t } from '../../i18n/t';
import type { ForecastEvaluationView } from '../../services/api/views';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import { EvaluationMetrics } from './EvaluationMetrics';
import { HorizonSkillTable } from './HorizonSkillTable';
import { horizonLabel } from './horizonLabel';
import styles from './EvaluationPage.module.css';
import { useForecastEvaluations } from './evaluationQueries';
import type { EvaluationPeriod } from './evaluationQueries';

/** The first horizon is the one shown when the screen opens (one day ahead). */
const FIRST_HORIZON_DAYS = 1;

const NO_PERIOD: EvaluationPeriod = { from: '', to: '' };

/**
 * Screen S23: whether the AI helps against the simple estimate. The headline answers the question
 * in plain words; the metrics of the selected horizon sit below it.
 */
export function EvaluationPage(): JSX.Element {
  const rules = useCurrentRuleSet();
  return (
    <>
      <ScreenTitle>{t('screens.evaluation')}</ScreenTitle>
      {rules.isPending ? (
        <LoadingState message={t('evaluation.loading')} />
      ) : rules.isError ? (
        <QueryError
          title={t('screens.evaluation')}
          error={rules.error}
          onRetry={() => {
            void rules.refetch();
          }}
        />
      ) : (
        <EvaluationPanel horizons={horizonsUpTo(rules.data.forecastHorizonDays)} />
      )}
    </>
  );
}

function EvaluationPanel({ horizons }: { readonly horizons: readonly number[] }): JSX.Element {
  const [period, setPeriod] = useState<EvaluationPeriod>(NO_PERIOD);
  const [selected, setSelected] = useState(FIRST_HORIZON_DAYS);
  const results = useForecastEvaluations(horizons, period);
  const failed = results.find((result) => result.isError);
  const loaded = results.every((result) => result.isSuccess);

  return (
    <div className={cn(styles.panel)}>
      <PeriodFilters period={period} onChange={setPeriod} />
      {!loaded && failed !== undefined ? (
        <QueryError
          title={t('screens.evaluation')}
          error={failed.error}
          onRetry={() => {
            for (const result of results) {
              void result.refetch();
            }
          }}
        />
      ) : !loaded ? (
        <LoadingState message={t('evaluation.loading')} />
      ) : (
        <EvaluationResult
          evaluations={results.map((result) => result.data).filter(isView)}
          horizons={horizons}
          selected={selected}
          onSelect={setSelected}
        />
      )}
    </div>
  );
}

interface EvaluationResultProps {
  readonly evaluations: readonly ForecastEvaluationView[];
  readonly horizons: readonly number[];
  readonly selected: number;
  readonly onSelect: (days: number) => void;
}

function EvaluationResult({
  evaluations,
  horizons,
  selected,
  onSelect,
}: EvaluationResultProps): JSX.Element {
  const verdict: AiVerdict = aiVerdict(evaluations.map((item) => ({ helps: item.helps })));
  const current = evaluations.find((item) => item.horizonDays === selected) ?? evaluations[0];
  if (current === undefined || evaluations.every((item) => item.n === 0)) {
    return <p>{t('evaluation.empty')}</p>;
  }
  return (
    <>
      <HorizonPicker horizons={horizons} selected={current.horizonDays} onSelect={onSelect} />
      <h2 className={cn(styles.headline)}>{headlineText(verdict)}</h2>
      <HorizonSkillTable evaluations={evaluations} />
      {current.helps === null ? (
        <p>{t('evaluation.insufficient', { count: current.n })}</p>
      ) : (
        <>
          <p className={cn(styles.count)}>{t('evaluation.evaluatedCount', { count: current.n })}</p>
          <EvaluationMetrics evaluation={current} />
        </>
      )}
    </>
  );
}

function headlineText(verdict: AiVerdict): string {
  switch (verdict) {
    case 'HELPS':
      return t('evaluation.headlineHelps');
    case 'DOES_NOT_HELP':
      return t('evaluation.headlineDoesNotHelp');
    case 'UNKNOWN':
      return t('evaluation.headlineUnknown');
  }
}

function isView(value: ForecastEvaluationView | undefined): value is ForecastEvaluationView {
  return value !== undefined;
}

function PeriodFilters({
  period,
  onChange,
}: {
  readonly period: EvaluationPeriod;
  readonly onChange: (period: EvaluationPeriod) => void;
}): JSX.Element {
  return (
    <form
      className={cn(styles.filters)}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <TextField
        label={t('evaluation.from')}
        type="date"
        value={period.from}
        onChange={(event) => {
          onChange({ ...period, from: event.target.value });
        }}
      />
      <TextField
        label={t('evaluation.to')}
        type="date"
        value={period.to}
        onChange={(event) => {
          onChange({ ...period, to: event.target.value });
        }}
      />
    </form>
  );
}

function HorizonPicker({
  horizons,
  selected,
  onSelect,
}: {
  readonly horizons: readonly number[];
  readonly selected: number;
  readonly onSelect: (days: number) => void;
}): JSX.Element {
  return (
    <div className={cn(styles.horizons)} role="group" aria-label={t('evaluation.horizonPicker')}>
      {horizons.map((days) => (
        <Button
          key={days}
          aria-pressed={days === selected}
          variant={days === selected ? 'primary' : 'secondary'}
          onClick={() => {
            onSelect(days);
          }}
        >
          {horizonLabel(days)}
        </Button>
      ))}
    </div>
  );
}
