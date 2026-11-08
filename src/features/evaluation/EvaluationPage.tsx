import { useState } from 'react';
import type { JSX } from 'react';

import { Gauge, Target } from 'lucide-react';

import { formatDecimal } from '../../core/format/decimal';
import {
  aiVerdict,
  formatPercent,
  formatSignedPercent,
  horizonsUpTo,
} from '../../core/evaluation/forecastEvaluation';
import type { AiVerdict } from '../../core/evaluation/forecastEvaluation';
import { t } from '../../i18n/t';
import type { ForecastEvaluationView } from '../../services/api/views';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Card } from '../../ui/cards/Card';
import { StatTile } from '../../ui/cards/StatTile';
import { AreaTrend } from '../../ui/data/AreaTrend';
import { ChartCard } from '../../ui/data/ChartCard';
import { SegmentedControl } from '../../ui/primitives/SegmentedControl';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import { TeamDashboard, TeamTiles } from './TeamDashboard';
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
      <TeamDashboard />
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
    return (
      <>
        <div className={cn(styles.tiles)}>
          <TeamTiles />
        </div>
        <p>{t('evaluation.empty')}</p>
      </>
    );
  }
  const points = evaluations.flatMap((item) =>
    item.maeIa === null ? [] : [{ label: horizonLabel(item.horizonDays), value: item.maeIa }],
  );
  return (
    <>
      <HorizonPicker horizons={horizons} selected={current.horizonDays} onSelect={onSelect} />
      <div className={cn(styles.tiles)}>
        <EvaluationTiles evaluation={current} />
        <TeamTiles />
      </div>
      <div className={cn(styles.overview)}>
        <ChartCard
          title={t('evaluation.errorChartTitle')}
          caption={t('evaluation.errorChartCaption')}
          className={cn(styles.chart)}
        >
          <AreaTrend title={t('evaluation.errorChartTitle')} data={points} formatValue={meters} />
        </ChartCard>
        <Card
          variant="dark"
          as="section"
          aria-labelledby="evaluation-verdict"
          className={cn(styles.verdict)}
        >
          <h2 id="evaluation-verdict" className={cn(styles.headline)}>
            {headlineText(verdict)}
          </h2>
          {current.helps === null ? (
            <p>{t('evaluation.insufficient', { count: current.n })}</p>
          ) : (
            <p>{t('evaluation.evaluatedCount', { count: current.n })}</p>
          )}
        </Card>
      </div>
      <HorizonSkillTable evaluations={evaluations} />
      {current.helps === null ? null : <EvaluationMetrics evaluation={current} />}
    </>
  );
}

/** The first two pastel tiles: the model's error against the simple estimate, and the range coverage. */
function EvaluationTiles({
  evaluation,
}: {
  readonly evaluation: ForecastEvaluationView;
}): JSX.Element {
  const skill = evaluation.skill;
  return (
    <>
      <StatTile
        icon={Target}
        tint="aqua"
        label={t('evaluation.tileError')}
        value={evaluation.maeIa === null ? t('evaluation.noValue') : meters(evaluation.maeIa)}
        delta={
          skill === null
            ? undefined
            : {
                text: formatSignedPercent(skill),
                trend: skill > 0 ? 'up' : skill < 0 ? 'down' : 'flat',
                tone: skill > 0 ? 'good' : skill < 0 ? 'bad' : 'neutral',
              }
        }
      />
      <StatTile
        icon={Gauge}
        tint="cream"
        label={t('evaluation.tileCoverage')}
        value={
          evaluation.coverage80 === null
            ? t('evaluation.noValue')
            : formatPercent(evaluation.coverage80)
        }
      />
    </>
  );
}

const METER_DIGITS = 2;

function meters(value: number): string {
  return t('evaluation.meters', { value: formatDecimal(value, METER_DIGITS) });
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
    <div className={cn(styles.horizons)}>
      <SegmentedControl
        label={t('evaluation.horizonPicker')}
        value={String(selected)}
        onChange={(value) => {
          onSelect(Number(value));
        }}
        options={horizons.map((days) => ({ value: String(days), label: horizonLabel(days) }))}
      />
    </div>
  );
}
