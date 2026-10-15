import { useState } from 'react';
import type { JSX } from 'react';

import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import type { SummaryView } from '../../services/api/views';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './Entities.module.css';
import { CreateShareDialog, RevokeShareDialog } from './EntityShareDialogs';
import { useSummaryAuthorizations } from './entityQueries';
import { summaryScopeText } from './summaryScope';

/**
 * Screen S22: the summaries the Board has authorized for entities. Authorizing and revoking are
 * BOARD_ADMIN actions (SUMMARY_SHARE_MANAGE); the server checks every call.
 */
export function EntitiesPage(): JSX.Element {
  const summaries = useSummaryAuthorizations();
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (summaries.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.entities')}</ScreenTitle>
        <LoadingState message={t('entities.loading')} />
      </>
    );
  }
  if (summaries.isError) {
    return (
      <QueryError
        title={t('screens.entities')}
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
      <ScreenTitle>{t('screens.entities')}</ScreenTitle>
      <div className={cn(styles.toolbar)}>
        <CreateShareDialog
          open={creating}
          onOpenChange={setCreating}
          trigger={<Button variant="primary">{t('entities.create')}</Button>}
          onCreated={() => {
            setNotice(t('entities.created'));
          }}
        />
      </div>
      {notice === null ? null : <p role="status">{notice}</p>}
      {items.length === 0 ? (
        <p>{t('entities.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {items.map((summary) => (
            <ShareItem
              key={summary.summaryShareId}
              summary={summary}
              onRevoked={() => {
                setNotice(t('entities.revoked'));
              }}
            />
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
          {t('entities.loadMore')}
        </Button>
      ) : null}
    </>
  );
}

interface ShareItemProps {
  readonly summary: SummaryView;
  readonly onRevoked: () => void;
}

function ShareItem({ summary, onRevoked }: ShareItemProps): JSX.Element {
  const [revoking, setRevoking] = useState(false);
  return (
    <li className={styles.item}>
      <h3 className={styles.name}>{summaryScopeText(summary.scope)}</h3>
      <p className={styles.meta}>
        {t('entities.period', {
          from: formatDayKey(summary.periodFrom),
          to: formatDayKey(summary.periodTo),
        })}
      </p>
      <p className={styles.meta}>{t('entities.current')}</p>
      <div className={cn(styles.actions)}>
        <RevokeShareDialog
          shareId={summary.summaryShareId}
          open={revoking}
          onOpenChange={setRevoking}
          trigger={<Button>{t('entities.revoke')}</Button>}
          onRevoked={onRevoked}
        />
      </div>
    </li>
  );
}
