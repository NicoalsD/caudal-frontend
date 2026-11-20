import { useState } from 'react';
import type { JSX } from 'react';
import { CheckCheck, Eye, FileText, Lightbulb, Ruler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import type { SummarySectionsView, SummaryView } from '../../services/api/views';
import { Card } from '../../ui/cards/Card';
import type { Tint } from '../../ui/cards/Card';
import { StatTile } from '../../ui/cards/StatTile';
import { BarChart, SERIES_COLOR, SERIES_TOKENS } from '../../ui/charts/BarChart';
import { AreaTrend } from '../../ui/data/AreaTrend';
import { ChartCard } from '../../ui/data/ChartCard';
import { DataTable } from '../../ui/data/DataTable';
import type { DataColumn } from '../../ui/data/DataTable';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { TextTabs, tabPanelProps } from '../../ui/primitives/TextTabs';
import { cn } from '../../ui/styles/cn';
import { summaryScopeText } from '../entities/summaryScope';
import styles from './EntitySummaries.module.css';
import { useVisibleSummaries } from './entitySummaryQueries';

type ScopeTab = 'all' | 'MONTHLY_SUMMARY' | 'MINUTES';
const TABS_ID = 'entity-summaries';
const NO_RECORDS = 0;

/**
 * Screen S28: the summaries the Board authorized for this entity, read only. The top shows four
 * pastel tiles with the records of each epistemic section (observed, estimated, inferred,
 * confirmed), a trend of the records per summary and the same counts side by side; the list is a
 * clean table. Each section is named in words, never only by its color.
 */
export function EntitySummariesPage(): JSX.Element {
  const summaries = useVisibleSummaries();

  if (summaries.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.summaries')}</ScreenTitle>
        <LoadingState message={t('entitySummaries.loading')} />
      </>
    );
  }
  if (summaries.isError) {
    return (
      <QueryError
        title={t('screens.summaries')}
        error={summaries.error}
        onRetry={() => {
          void summaries.refetch();
        }}
      />
    );
  }

  const items = summaries.data.pages.flatMap((page) => page.items);

  return (
    <div className={cn(styles.page)}>
      <ScreenTitle>{t('screens.summaries')}</ScreenTitle>
      {items.length === 0 ? (
        <p>{t('entitySummaries.empty')}</p>
      ) : (
        <>
          <SectionTiles items={items} />
          <div className={cn(styles.charts)}>
            <TrendCard items={items} />
            <Card
              as="section"
              aria-label={t('entitySummaries.chart')}
              className={cn(styles.barCard)}
            >
              <SummariesChart items={items} />
            </Card>
          </div>
          <SummaryTable items={items} />
        </>
      )}
      {summaries.hasNextPage ? (
        <Button
          disabled={summaries.isFetchingNextPage}
          onClick={() => {
            void summaries.fetchNextPage();
          }}
        >
          {t('entitySummaries.loadMore')}
        </Button>
      ) : null}
    </div>
  );
}

const SECTION_KEYS: readonly (keyof SummarySectionsView)[] = [
  'observed',
  'estimated',
  'inferred',
  'confirmed',
];

const SECTION_TEXT: Readonly<Record<keyof SummarySectionsView, string>> = {
  observed: t('entitySummaries.sections.observed'),
  estimated: t('entitySummaries.sections.estimated'),
  inferred: t('entitySummaries.sections.inferred'),
  confirmed: t('entitySummaries.sections.confirmed'),
};

const SECTION_LOOK: Readonly<Record<keyof SummarySectionsView, { icon: LucideIcon; tint: Tint }>> =
  {
    observed: { icon: Eye, tint: 'aqua' },
    estimated: { icon: Ruler, tint: 'cream' },
    inferred: { icon: Lightbulb, tint: 'lavender' },
    confirmed: { icon: CheckCheck, tint: 'mint' },
  };

function total(content: SummarySectionsView): number {
  return SECTION_KEYS.reduce((sum, key) => sum + content[key], NO_RECORDS);
}

/** One pastel tile per section, with the sum of its records across every summary. */
function SectionTiles({ items }: { readonly items: readonly SummaryView[] }): JSX.Element {
  return (
    <ul className={cn(styles.tiles)} aria-label={t('entitySummaries.sectionsLabel')}>
      {SECTION_KEYS.map((key) => {
        const look = SECTION_LOOK[key];
        const sum = items.reduce((acc, summary) => acc + summary.content[key], NO_RECORDS);
        return (
          <li key={key} className={cn(styles.tile)} data-section={key}>
            <StatTile
              icon={look.icon}
              tint={look.tint}
              label={SECTION_TEXT[key]}
              value={String(sum)}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** Records of each summary from the oldest to the newest, as a soft area. */
function TrendCard({ items }: { readonly items: readonly SummaryView[] }): JSX.Element {
  const ordered = [...items].sort((a, b) => a.periodFrom.localeCompare(b.periodFrom));
  const grand = ordered.reduce((sum, summary) => sum + total(summary.content), NO_RECORDS);
  return (
    <ChartCard
      title={t('entitySummaries.trendTitle')}
      value={String(grand)}
      caption={t('entitySummaries.trendCaption')}
      className={cn(styles.trend)}
    >
      <AreaTrend
        title={t('entitySummaries.trendTitle')}
        data={ordered.map((summary) => ({
          label: formatDayKey(summary.periodTo),
          value: total(summary.content),
        }))}
        formatValue={String}
      />
    </ChartCard>
  );
}

/** The four counts of every summary side by side; the table under it has the same numbers. */
function SummariesChart({ items }: { readonly items: readonly SummaryView[] }): JSX.Element {
  return (
    <BarChart
      label={t('entitySummaries.chart')}
      rows={items.map((summary, index) => ({
        name: `${summaryScopeText(summary.scope)} ${t('entities.period', {
          from: formatDayKey(summary.periodFrom),
          to: formatDayKey(summary.periodTo),
        })} (${String(index + 1)})`,
        values: { ...summary.content },
      }))}
      series={SECTION_KEYS.map((key, index) => ({
        key,
        label: SECTION_TEXT[key],
        token: SERIES_TOKENS.at(index) ?? SERIES_COLOR.water,
      }))}
    />
  );
}

/** The summaries as a clean table with the scope as text tabs. */
function SummaryTable({ items }: { readonly items: readonly SummaryView[] }): JSX.Element {
  const [tab, setTab] = useState<ScopeTab>('all');
  const rows = tab === 'all' ? items : items.filter((summary) => summary.scope === tab);
  const columns: DataColumn<SummaryView>[] = [
    {
      id: 'summary',
      header: t('entitySummaries.colSummary'),
      cell: (row) => (
        <span className={cn(styles.name)}>
          <FileText aria-hidden="true" />
          {summaryScopeText(row.scope)}
        </span>
      ),
    },
    {
      id: 'period',
      header: t('entitySummaries.colPeriod'),
      cell: (row) =>
        t('entities.period', {
          from: formatDayKey(row.periodFrom),
          to: formatDayKey(row.periodTo),
        }),
    },
    ...SECTION_KEYS.map((key): DataColumn<SummaryView> => ({
      id: key,
      header: SECTION_TEXT[key],
      align: 'end',
      hideOnNarrow: true,
      cell: (row) => String(row.content[key]),
    })),
    {
      id: 'total',
      header: t('entitySummaries.colTotal'),
      align: 'end',
      cell: (row) => <Chip tone="aqua">{String(total(row.content))}</Chip>,
    },
  ];
  return (
    <Card as="section" aria-labelledby="entity-summaries-list" className={cn(styles.listCard)}>
      <div className={cn(styles.listHead)}>
        <h2 id="entity-summaries-list" className={cn(styles.title)}>
          {t('entitySummaries.summariesLabel')}
        </h2>
        <TextTabs
          label={t('entitySummaries.tabsLabel')}
          idPrefix={TABS_ID}
          value={tab}
          onChange={(next) => {
            setTab(next as ScopeTab);
          }}
          tabs={[
            { id: 'all', label: t('entitySummaries.tabAll') },
            { id: 'MONTHLY_SUMMARY', label: t('entitySummaries.tabMonthly') },
            { id: 'MINUTES', label: t('entitySummaries.tabMinutes') },
          ]}
        />
      </div>
      <div {...tabPanelProps(TABS_ID, tab)}>
        <DataTable
          caption={t('entitySummaries.tableCaption')}
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.summaryShareId}
          empty={{ title: t('entitySummaries.emptyTab') }}
        />
      </div>
    </Card>
  );
}
