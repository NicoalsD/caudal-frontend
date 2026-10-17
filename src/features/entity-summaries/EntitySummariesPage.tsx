import type { JSX } from 'react';

import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import type { SummarySectionsView, SummaryView } from '../../services/api/views';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { summaryScopeText } from '../entities/summaryScope';
import styles from './EntitySummaries.module.css';
import { useVisibleSummaries } from './entitySummaryQueries';

/**
 * Screen S28: the summaries the Board authorized for this entity, read only. Each one shows how
 * many records fall in each of the four epistemic sections (observed, estimated, inferred,
 * confirmed), with the name of the section, never only its color.
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
    <>
      <ScreenTitle>{t('screens.summaries')}</ScreenTitle>
      {items.length === 0 ? (
        <p>{t('entitySummaries.empty')}</p>
      ) : (
        <ul className={cn(styles.list)}>
          {items.map((summary) => (
            <SummaryItem key={summary.summaryShareId} summary={summary} />
          ))}
        </ul>
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
    </>
  );
}

function SummaryItem({ summary }: { readonly summary: SummaryView }): JSX.Element {
  return (
    <li className={cn(styles.item)}>
      <h3 className={cn(styles.name)}>{summaryScopeText(summary.scope)}</h3>
      <p className={cn(styles.meta)}>
        {t('entities.period', {
          from: formatDayKey(summary.periodFrom),
          to: formatDayKey(summary.periodTo),
        })}
      </p>
      <SectionChips sections={summary.content} />
    </li>
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

/** The four epistemic counts. Each chip names its section in words; the color is never the only cue. */
function SectionChips({ sections }: { readonly sections: SummarySectionsView }): JSX.Element {
  return (
    <ul className={cn(styles.chips)} aria-label={t('entitySummaries.sectionsLabel')}>
      {SECTION_KEYS.map((key) => (
        <li key={key} className={cn(styles.chip)} data-section={key}>
          <span>{SECTION_TEXT[key]}</span>
          <strong>{String(sections[key])}</strong>
        </li>
      ))}
    </ul>
  );
}
