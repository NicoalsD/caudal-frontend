import type { JSX, ReactNode } from 'react';

import { t } from '../../i18n/t';
import { useOpenAnomalies } from '../../state/hooks/useAnomalies';
import { usePermission } from '../../state/hooks/usePermission';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { cn } from '../../ui/styles/cn';
import { AnomalyItem } from './AnomalyItem';
import styles from './TankStatus.module.css';

const REVIEW_PERMISSION = 'ANOMALY_REVIEW';

interface AnomalyListProps {
  /** Whatever else the screen has to review (the Board adds the open damage reports). */
  readonly extra?: ReactNode;
  /** True when that extra content has something; with no anomalies either, one calm line shows. */
  readonly extraHasItems?: boolean;
  /** The console already says there is nothing to review: no line of its own. */
  readonly hideWhenEmpty?: boolean;
}

/**
 * "Para revisar": the open anomalies of the aqueduct, in compact rows, with the review actions for
 * the people who may review. Empty, it is a single calm line.
 */
export function AnomalyList({
  extra,
  extraHasItems = false,
  hideWhenEmpty = false,
}: AnomalyListProps): JSX.Element {
  const open = useOpenAnomalies();
  const canReview = usePermission(REVIEW_PERMISSION);

  const empty = !open.isPending && !open.isError && open.data.items.length === 0;
  if (empty && !extraHasItems && hideWhenEmpty) {
    return <></>;
  }
  if (empty && !extraHasItems) {
    return (
      <section className={cn(styles.card, styles.reviewEmpty)} aria-labelledby="review-title">
        <h2 id="review-title" className={cn(styles.visuallyHidden)}>
          {t('anomalies.reviewTitle')}
        </h2>
        <p>{t('anomalies.nothingToReview')}</p>
      </section>
    );
  }

  let body: JSX.Element;
  if (open.isPending) {
    body = <LoadingState message={t('anomalies.loading')} />;
  } else if (open.isError) {
    body = (
      <QueryError
        title={t('anomalies.title')}
        error={open.error}
        onRetry={() => void open.refetch()}
      />
    );
  } else if (open.data.items.length === 0) {
    body = <p>{t('anomalies.none')}</p>;
  } else {
    body = (
      <>
        {canReview ? (
          <p className={cn(styles.muted)}>
            {t('anomalies.confirmHelp')} {t('anomalies.dismissHelp')}
          </p>
        ) : null}
        <ul className={cn(styles.anomalyList)}>
          {open.data.items.map((anomaly) => (
            <AnomalyItem key={anomaly.id} anomaly={anomaly} canReview={canReview} />
          ))}
        </ul>
      </>
    );
  }
  return (
    <section className={cn(styles.card, styles.review)}>
      <h2 id="review-title" className={cn(styles.visuallyHidden)}>
        {t('anomalies.reviewTitle')}
      </h2>
      <div className={cn(styles.reviewColumns)}>
        <section aria-labelledby="anomalies-title" className={cn(styles.reviewColumn)}>
          <h3 id="anomalies-title">{t('anomalies.title')}</h3>
          {body}
        </section>
        {extra}
      </div>
    </section>
  );
}
