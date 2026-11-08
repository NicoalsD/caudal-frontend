import { FileText, FilePlus } from 'lucide-react';
import { useState } from 'react';
import type { JSX } from 'react';

import { formatDayKey } from '../../core/format/time';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import type { MinutesSummaryView } from '../../services/api/views';
import { useConnection } from '../../state/hooks/useConnection';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Card } from '../../ui/cards/Card';
import { EmptyPanel } from '../../ui/layout/EmptyPanel';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { MinutesDetail } from './MinutesDetail';
import { PeriodForm } from './PeriodForm';
import styles from './Minutes.module.css';
import { useGenerateMinutes, useMinutesList } from './minutesQueries';

/** Screen S20: the actas of the Board. Generate one, open one, and see its four sections. */
export function MinutesPage(): JSX.Element {
  const list = useMinutesList();
  const generate = useGenerateMinutes();
  const connection = useConnection();
  const [choosing, setChoosing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const online = connection === 'ONLINE';

  if (list.isPending) {
    return <LoadingState message={t('minutes.loading')} />;
  }
  if (list.isError) {
    return (
      <ErrorState
        title={t('screens.minutes')}
        message={t('minutes.errorBody')}
        action={
          <Button
            onClick={() => {
              void list.refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const items = list.data.pages.flatMap((page) => page.items);
  const generateFailure = generate.isError ? errorText(generate.error).message : null;

  return (
    <div className={cn(styles.page)}>
      <ScreenTitle>{t('screens.minutes')}</ScreenTitle>
      <PageHeader
        lead={t('minutes.lead')}
        actions={
          choosing ? undefined : (
            <Button
              variant="primary"
              disabled={!online}
              onClick={() => {
                setChoosing(true);
              }}
            >
              <FilePlus aria-hidden="true" />
              {t('minutes.generate')}
            </Button>
          )
        }
      />
      {online ? null : <p role="status">{t('minutes.offline')}</p>}
      {choosing ? (
        <Card
          as="section"
          variant="tinted"
          tint="hero"
          aria-labelledby="minutes-period-title"
          className={cn(styles.stack)}
        >
          <h2 id="minutes-period-title" className={cn(styles.cardTitle)}>
            {t('minutes.periodTitle')}
          </h2>
          <PeriodForm
            isSaving={generate.isPending}
            failure={generateFailure}
            onSubmit={(input) => {
              generate.mutate(input, {
                onSuccess: (view) => {
                  setChoosing(false);
                  setSelectedId(view.id);
                },
              });
            }}
            onCancel={() => {
              setChoosing(false);
            }}
          />
        </Card>
      ) : null}
      {generate.isPending && !choosing ? <LoadingState message={t('minutes.generating')} /> : null}
      {generateFailure !== null && !choosing ? <FormAlert message={generateFailure} /> : null}
      {items.length === 0 ? (
        <EmptyPanel icon={FileText} title={t('minutes.empty')} />
      ) : (
        <ul className={cn(styles.list)}>
          {items.map((item) => (
            <MinutesRow
              key={item.id}
              item={item}
              onOpen={() => {
                setSelectedId(item.id);
              }}
            />
          ))}
        </ul>
      )}
      {list.hasNextPage ? (
        <Button
          disabled={list.isFetchingNextPage}
          onClick={() => {
            void list.fetchNextPage();
          }}
        >
          {t('minutes.loadMore')}
        </Button>
      ) : null}
      {selectedId === null ? null : <MinutesDetail key={selectedId} id={selectedId} />}
    </div>
  );
}

function MinutesRow({
  item,
  onOpen,
}: {
  readonly item: MinutesSummaryView;
  readonly onOpen: () => void;
}): JSX.Element {
  const period = t('minutes.period', {
    from: formatDayKey(item.periodFrom),
    to: formatDayKey(item.periodTo),
  });
  const status = item.status === 'FINAL' ? t('minutes.statusFinal') : t('minutes.statusDraft');
  return (
    <Card as="li" interactive className={cn(styles.listItem)}>
      <span className={cn(styles.docIcon)}>
        <FileText aria-hidden="true" />
      </span>
      <span className={cn(styles.rowText)}>{t('minutes.rowSummary', { period, status })}</span>
      <Button onClick={onOpen}>{t('minutes.view')}</Button>
    </Card>
  );
}
