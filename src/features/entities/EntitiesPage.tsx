import { Building2 } from 'lucide-react';
import { useState } from 'react';
import type { JSX } from 'react';

import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import type { SummaryView } from '../../services/api/views';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Card } from '../../ui/cards/Card';
import { EmptyPanel } from '../../ui/layout/EmptyPanel';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Badge } from '../../ui/primitives/Badge';
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
    <div className={cn(styles.page)}>
      <ScreenTitle>{t('screens.entities')}</ScreenTitle>
      <PageHeader
        lead={t('entities.lead')}
        actions={
          <CreateShareDialog
            open={creating}
            onOpenChange={setCreating}
            trigger={<Button variant="primary">{t('entities.create')}</Button>}
            onCreated={() => {
              setNotice(t('entities.created'));
            }}
          />
        }
      />
      {notice === null ? null : <p role="status">{notice}</p>}
      {items.length === 0 ? (
        <EmptyPanel icon={Building2} title={t('entities.empty')} />
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
    </div>
  );
}

interface ShareItemProps {
  readonly summary: SummaryView;
  readonly onRevoked: () => void;
}

function ShareItem({ summary, onRevoked }: ShareItemProps): JSX.Element {
  const [revoking, setRevoking] = useState(false);
  return (
    <Card as="li" className={cn(styles.item)}>
      <div className={cn(styles.head)}>
        <span className={cn(styles.icon)}>
          <Building2 aria-hidden="true" />
        </span>
        <h3 className={styles.name}>{summaryScopeText(summary.scope)}</h3>
      </div>
      <p className={styles.meta}>
        {t('entities.period', {
          from: formatDayKey(summary.periodFrom),
          to: formatDayKey(summary.periodTo),
        })}
      </p>
      <Badge tone="ok">{t('entities.current')}</Badge>
      <div className={cn(styles.actions)}>
        <RevokeShareDialog
          shareId={summary.summaryShareId}
          open={revoking}
          onOpenChange={setRevoking}
          trigger={<Button variant="ghost">{t('entities.revoke')}</Button>}
          onRevoked={onRevoked}
        />
      </div>
    </Card>
  );
}
