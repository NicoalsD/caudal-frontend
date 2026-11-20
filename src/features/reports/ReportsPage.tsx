import { useState } from 'react';
import { Activity, Bot, TriangleAlert, Waves } from 'lucide-react';
import type { JSX } from 'react';

import {
  DEFAULT_REPORT_DAYS,
  WEEK_DAYS,
  lastDays,
  periodProblem,
  reportInstants,
} from '../../core/reports/reportPeriod';
import { llmShare, sumBy, totalOf } from '../../core/reports/reportModel';
import { coverageByRegion } from '../../core/reports/regionCoverage';
import { formatDecimal } from '../../core/format/decimal';
import { anomalyKindText } from '../../i18n/anomalyKindText';
import { errorText } from '../../i18n/errorText';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { ReportView } from '../../services/api/views';
import { useDamageCategories } from '../../state/hooks/useDamageCategories';
import { useNarrativeReport, useReport } from '../../state/hooks/useReports';
import { useSectors } from '../../state/hooks/useSectors';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { Card } from '../../ui/cards/Card';
import { StatTile } from '../../ui/cards/StatTile';
import { BarChart, SERIES_COLOR } from '../../ui/charts/BarChart';
import { ChartCard } from '../../ui/data/ChartCard';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { SegmentedControl } from '../../ui/primitives/SegmentedControl';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import { MarkdownView } from './MarkdownView';
import styles from './Reports.module.css';

const LEVEL_DIGITS = 2;
const WHOLE = 0;
const PERCENT = 100;
const FORTNIGHT_DAYS = 14;
const PRESETS = [
  { value: String(WEEK_DAYS), days: WEEK_DAYS, label: 'reports.range.week' },
  { value: String(FORTNIGHT_DAYS), days: FORTNIGHT_DAYS, label: 'reports.range.fortnight' },
  { value: String(DEFAULT_REPORT_DAYS), days: DEFAULT_REPORT_DAYS, label: 'reports.range.month' },
] as const;

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

  const preset =
    PRESETS.find((option) => {
      const days = lastDays(today, option.days);
      return days !== null && days.from === fromDay && days.to === toDay;
    })?.value ?? '';

  return (
    <div className={cn(styles.page)}>
      <ScreenTitle>{t('screens.reports')}</ScreenTitle>
      <Card as="div" className={cn(styles.head)} data-print-hide="">
        <SegmentedControl
          label={t('reports.range.label')}
          value={preset}
          options={PRESETS.map((option) => ({ value: option.value, label: t(option.label) }))}
          onChange={(next) => {
            const days = lastDays(today, Number(next));
            if (days !== null) {
              setFromDay(days.from);
              setToDay(days.to);
              narrative.reset();
            }
          }}
        />
        <form
          className={cn(styles.filters)}
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
        <Button
          onClick={() => {
            window.print();
          }}
        >
          {t('reports.print')}
        </Button>
      </Card>
      {problem === null ? null : (
        <p role="alert" className={cn(styles.problem)}>
          {t(`reports.problem.${problem}`)}
        </p>
      )}
      <p className={cn(styles.printOnly)}>
        {t('reports.printPeriod', { from: fromDay, to: toDay })}
      </p>

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
        <ReportTiles report={report.data} />
      )}

      <Card
        variant="dark"
        as={narrative.isSuccess ? 'article' : 'section'}
        aria-labelledby="report-narrative-title"
        className={cn(styles.narrative)}
      >
        <div className={cn(styles.narrativeBody)}>
          <div className={cn(styles.narrativeHead)}>
            <h2 id="report-narrative-title" className={cn(styles.narrativeTitle)}>
              {narrative.isSuccess ? narrative.data.title : t('reports.narrativeTitle')}
            </h2>
            {narrative.isSuccess ? (
              <Chip tone="aqua" icon={<Bot aria-hidden="true" />}>
                {t(`reports.badge.${lower(narrative.data.source) as 'llm'}`)}
              </Chip>
            ) : null}
          </div>
          {narrative.isSuccess ? (
            <>
              <p className={cn(styles.source)} role="status">
                {t('reports.sourceLine', {
                  source: t(`assistant.source.${lower(narrative.data.source)}`),
                })}
              </p>
              <div className={cn(styles.markdown)}>
                <MarkdownView source={narrative.data.markdown} />
              </div>
            </>
          ) : (
            <p className={cn(styles.source)}>{t('reports.narrativeHint')}</p>
          )}
          {narrative.isError ? (
            <FormAlert
              message={t('reports.narrativeError')}
              detail={errorText(narrative.error).message}
            />
          ) : null}
          <div className={cn(styles.actions)} data-print-hide="">
            <Button
              variant="onDark"
              disabled={period === null || narrative.isPending}
              onClick={() => {
                if (period !== null) {
                  narrative.mutate(period);
                }
              }}
            >
              {narrative.isPending ? t('reports.generating') : t('reports.generate')}
            </Button>
          </div>
        </div>
      </Card>

      {period === null || !report.isSuccess ? null : <ReportCharts report={report.data} />}
    </div>
  );
}

function ReportTiles({ report }: { readonly report: ReportView }): JSX.Element {
  const decisions = llmShare(report.decisions);
  const decided = decisions.llm + decisions.rules;
  return (
    <div className={cn(styles.tiles)} role="group" aria-label={t('reports.tiles.label')}>
      <StatTile
        icon={Waves}
        tint="aqua"
        label={t('reports.tiles.commands')}
        value={String(totalOf(report.commands))}
      />
      <StatTile
        icon={Bot}
        tint="lavender"
        label={t('reports.tiles.decisions')}
        value={String(decided)}
        {...(decided === 0
          ? {}
          : {
              footer: t('reports.tiles.llmShare', {
                percent: formatDecimal((decisions.llm / decided) * PERCENT, WHOLE),
              }),
            })}
      />
      <StatTile
        icon={TriangleAlert}
        tint="coral"
        label={t('reports.tiles.incidents')}
        value={String(totalOf(report.incidents))}
      />
      <StatTile
        icon={Activity}
        tint="sand"
        label={t('reports.tiles.anomalies')}
        value={String(totalOf(report.anomalies))}
      />
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
  const categories = useDamageCategories();
  const categoryLabels = new Map(
    (categories.data ?? []).map((option) => [option.code, option.label] as const),
  );
  return (
    <div className={cn(styles.grid)}>
      <Card
        variant="tinted"
        tint="aqua"
        as="section"
        aria-labelledby="rep-levels"
        className={cn(styles.card)}
      >
        <h2 id="rep-levels" className={cn(styles.cardTitle)}>
          {t('reports.levels.title')}
        </h2>
        {levels.readings === 0 ? (
          <p className={cn(styles.quiet)}>{t('reports.levels.none')}</p>
        ) : (
          <dl className={cn(styles.facts)}>
            <dt>{t('reports.levels.min')}</dt>
            <dd>
              {levels.min === null
                ? '-'
                : t('tankStatus.levelValue', { value: formatDecimal(levels.min, LEVEL_DIGITS) })}
            </dd>
            <dt>{t('reports.levels.avg')}</dt>
            <dd>
              {levels.avg === null
                ? '-'
                : t('tankStatus.levelValue', { value: formatDecimal(levels.avg, LEVEL_DIGITS) })}
            </dd>
            <dt>{t('reports.levels.max')}</dt>
            <dd>
              {levels.max === null
                ? '-'
                : t('tankStatus.levelValue', { value: formatDecimal(levels.max, LEVEL_DIGITS) })}
            </dd>
            <dt>{t('reports.levels.readings')}</dt>
            <dd>{String(levels.readings)}</dd>
          </dl>
        )}
      </Card>
      <ChartCard title={t('reports.coverage.title')}>
        <BarChart
          hideCaption
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
      </ChartCard>
      <ChartCard title={t('reports.commands.title', { total: String(totalOf(report.commands)) })}>
        <BarChart
          hideCaption
          label={t('reports.commands.chart')}
          rows={origin.map((entry) => ({
            name: t(`reports.origin.${lower(entry.key as 'SCHEDULE')}`),
            values: { total: entry.total },
          }))}
          series={[
            { key: 'total', label: t('reports.commands.series'), token: SERIES_COLOR.water },
          ]}
        />
      </ChartCard>
      <ChartCard title={t('reports.decisions.title')}>
        <BarChart
          hideCaption
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
      </ChartCard>
      <ChartCard title={t('reports.incidents.title')}>
        <BarChart
          hideCaption
          label={t('reports.incidents.chart')}
          rows={incidents.map((entry) => ({
            name: categoryLabels.get(entry.key) ?? entry.key,
            values: { total: entry.total },
          }))}
          series={[
            { key: 'total', label: t('reports.incidents.series'), token: SERIES_COLOR.clay },
          ]}
        />
      </ChartCard>
      <ChartCard title={t('reports.anomalies.title')}>
        <BarChart
          hideCaption
          label={t('reports.anomalies.chart')}
          rows={anomalies.map((row) => ({
            name: anomalyKindText(row.kind as Parameters<typeof anomalyKindText>[0]) ?? row.kind,
            values: { total: row.total },
          }))}
          series={[
            { key: 'total', label: t('reports.anomalies.series'), token: SERIES_COLOR.paramo },
          ]}
        />
      </ChartCard>
    </div>
  );
}
