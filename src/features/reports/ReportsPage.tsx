import { useState } from 'react';
import type { JSX } from 'react';

import {
  DEFAULT_REPORT_DAYS,
  lastDays,
  periodProblem,
  reportInstants,
} from '../../core/reports/reportPeriod';
import { llmShare, sumBy, totalOf } from '../../core/reports/reportModel';
import { coverageByRegion } from '../../core/reports/regionCoverage';
import { formatDecimal } from '../../core/format/decimal';
import { errorText } from '../../i18n/errorText';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { ReportView } from '../../services/api/views';
import { useNarrativeReport, useReport } from '../../state/hooks/useReports';
import { useSectors } from '../../state/hooks/useSectors';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { BarChart, SERIES_COLOR } from '../../ui/charts/BarChart';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import { MarkdownView } from './MarkdownView';
import styles from './Reports.module.css';

const LEVEL_DIGITS = 2;
const WHOLE = 0;
const PERCENT = 100;

/**
 * The report of a period: the numbers as charts (each with its table), and the narrative the
 * assistant writes on demand. It prints clean: the menu goes away and the text uses the sheet.
 */
export function ReportsPage(): JSX.Element {
  const today = useServiceToday();
  const initial = lastDays(today, DEFAULT_REPORT_DAYS);
  const [fromDay, setFromDay] = useState(initial?.from ?? '');
  const [toDay, setToDay] = useState(initial?.to ?? '');
  const problem = periodProblem(fromDay, toDay);
  const period = problem === null ? reportInstants(fromDay, toDay) : null;
  const report = useReport(period);
  const narrative = useNarrativeReport();

  return (
    <div className={cn(styles.page)}>
      <ScreenTitle>{t('screens.reports')}</ScreenTitle>
      <form
        className={cn(styles.filters)}
        data-print-hide=""
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <TextField
          label={t('reports.from')}
          type="date"
          value={fromDay}
          onChange={(event) => {
            setFromDay(event.target.value);
            narrative.reset();
          }}
        />
        <TextField
          label={t('reports.to')}
          type="date"
          value={toDay}
          onChange={(event) => {
            setToDay(event.target.value);
            narrative.reset();
          }}
        />
      </form>
      {problem === null ? null : (
        <p role="alert" className={cn(styles.problem)}>
          {t(`reports.problem.${problem}`)}
        </p>
      )}
      <p className={cn(styles.printOnly)}>
        {t('reports.printPeriod', { from: fromDay, to: toDay })}
      </p>

      <div className={cn(styles.actions)} data-print-hide="">
        <Button
          variant="primary"
          disabled={period === null || narrative.isPending}
          onClick={() => {
            if (period !== null) {
              narrative.mutate(period);
            }
          }}
        >
          {narrative.isPending ? t('reports.generating') : t('reports.generate')}
        </Button>
        <Button
          onClick={() => {
            window.print();
          }}
        >
          {t('reports.print')}
        </Button>
      </div>

      {narrative.isError ? (
        <FormAlert
          message={t('reports.narrativeError')}
          detail={errorText(narrative.error).message}
        />
      ) : null}
      {narrative.isSuccess ? (
        <article className={cn(styles.narrative)} aria-labelledby="report-narrative-title">
          <h2 id="report-narrative-title">{narrative.data.title}</h2>
          <p className={cn(styles.source)} role="status">
            {t('reports.sourceLine', {
              source: t(`assistant.source.${lower(narrative.data.source)}`),
            })}
          </p>
          <MarkdownView source={narrative.data.markdown} />
        </article>
      ) : null}

      {period === null ? null : report.isPending ? (
        <LoadingState message={t('reports.loading')} />
      ) : report.isError ? (
        <QueryError
          title={t('screens.reports')}
          error={report.error}
          onRetry={() => {
            void report.refetch();
          }}
        />
      ) : (
        <ReportCharts report={report.data} />
      )}
    </div>
  );
}

function ReportCharts({ report }: { readonly report: ReportView }): JSX.Element {
  const sectors = useSectors();
  const levels = report.levels;
  const coverage = coverageByRegion(report.shifts, sectors.data ?? []);
  const origin = sumBy(report.commands, (row) => row.origin);
  const decisions = llmShare(report.decisions);
  const incidents = sumBy(report.incidents, (row) => row.category);
  const anomalies = report.anomalies;
  return (
    <div className={cn(styles.grid)}>
      <section className={cn(styles.card)} aria-labelledby="rep-levels">
        <h2 id="rep-levels" className={cn(styles.cardTitle)}>
          {t('reports.levels.title')}
        </h2>
        {levels.readings === 0 ? (
          <p className={cn(styles.quiet)}>{t('reports.levels.none')}</p>
        ) : (
          <dl className={cn(styles.facts)}>
            <dt>{t('reports.levels.min')}</dt>
            <dd>{levels.min === null ? '-' : formatDecimal(levels.min, LEVEL_DIGITS)}</dd>
            <dt>{t('reports.levels.avg')}</dt>
            <dd>{levels.avg === null ? '-' : formatDecimal(levels.avg, LEVEL_DIGITS)}</dd>
            <dt>{t('reports.levels.max')}</dt>
            <dd>{levels.max === null ? '-' : formatDecimal(levels.max, LEVEL_DIGITS)}</dd>
            <dt>{t('reports.levels.readings')}</dt>
            <dd>{String(levels.readings)}</dd>
          </dl>
        )}
      </section>
      <section className={cn(styles.card)} aria-labelledby="rep-coverage">
        <h2 id="rep-coverage" className={cn(styles.cardTitle)}>
          {t('reports.coverage.title')}
        </h2>
        <BarChart
          label={t('reports.coverage.chart')}
          rows={coverage.map((row) => ({
            name: row.region,
            values: { planned: row.plannedShifts, completed: row.completedShifts },
          }))}
          series={[
            { key: 'planned', label: t('reports.coverage.planned'), token: SERIES_COLOR.water },
            { key: 'completed', label: t('reports.coverage.completed'), token: SERIES_COLOR.ochre },
          ]}
        />
        <p className={cn(styles.quiet)}>
          {coverage
            .filter((row) => row.share !== null)
            .map((row) =>
              t('reports.coverage.line', {
                region: row.region,
                percent: formatDecimal((row.share ?? 0) * PERCENT, WHOLE),
              }),
            )
            .join('. ')}
        </p>
      </section>
      <section className={cn(styles.card)} aria-labelledby="rep-commands">
        <h2 id="rep-commands" className={cn(styles.cardTitle)}>
          {t('reports.commands.title', { total: String(totalOf(report.commands)) })}
        </h2>
        <BarChart
          label={t('reports.commands.chart')}
          rows={origin.map((entry) => ({
            name: t(`reports.origin.${lower(entry.key as 'SCHEDULE')}`),
            values: { total: entry.total },
          }))}
          series={[
            { key: 'total', label: t('reports.commands.series'), token: SERIES_COLOR.water },
          ]}
        />
      </section>
      <section className={cn(styles.card)} aria-labelledby="rep-decisions">
        <h2 id="rep-decisions" className={cn(styles.cardTitle)}>
          {t('reports.decisions.title')}
        </h2>
        <BarChart
          label={t('reports.decisions.chart')}
          rows={
            decisions.llm + decisions.rules === 0
              ? []
              : [
                  {
                    name: t('reports.decisions.row'),
                    values: { llm: decisions.llm, rules: decisions.rules },
                  },
                ]
          }
          series={[
            { key: 'llm', label: t('assistant.source.llm'), token: SERIES_COLOR.water },
            { key: 'rules', label: t('assistant.source.rules'), token: SERIES_COLOR.ochre },
          ]}
          stacked
        />
      </section>
      <section className={cn(styles.card)} aria-labelledby="rep-incidents">
        <h2 id="rep-incidents" className={cn(styles.cardTitle)}>
          {t('reports.incidents.title')}
        </h2>
        <BarChart
          label={t('reports.incidents.chart')}
          rows={incidents.map((entry) => ({ name: entry.key, values: { total: entry.total } }))}
          series={[
            { key: 'total', label: t('reports.incidents.series'), token: SERIES_COLOR.clay },
          ]}
        />
      </section>
      <section className={cn(styles.card)} aria-labelledby="rep-anomalies">
        <h2 id="rep-anomalies" className={cn(styles.cardTitle)}>
          {t('reports.anomalies.title')}
        </h2>
        <BarChart
          label={t('reports.anomalies.chart')}
          rows={anomalies.map((row) => ({ name: row.kind, values: { total: row.total } }))}
          series={[
            { key: 'total', label: t('reports.anomalies.series'), token: SERIES_COLOR.paramo },
          ]}
        />
      </section>
    </div>
  );
}
