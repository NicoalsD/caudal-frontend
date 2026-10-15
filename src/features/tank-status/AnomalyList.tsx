import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { useOpenAnomalies } from '../../state/hooks/useAnomalies';
import { usePermission } from '../../state/hooks/usePermission';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { cn } from '../../ui/styles/cn';
import { AnomalyItem } from './AnomalyItem';
import styles from './TankStatus.module.css';

const REVIEW_PERMISSION = 'ANOMALY_REVIEW';

/** The open anomalies of the aqueduct, with the review actions for the people who may review. */
export function AnomalyList(): JSX.Element {
  const open = useOpenAnomalies();
  const canReview = usePermission(REVIEW_PERMISSION);

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
      <ul className={cn(styles.anomalyList)}>
        {open.data.items.map((anomaly) => (
          <AnomalyItem key={anomaly.id} anomaly={anomaly} canReview={canReview} />
        ))}
      </ul>
    );
  }
  return (
    <section className={cn(styles.card)} aria-labelledby="anomalies-title">
      <h2 id="anomalies-title">{t('anomalies.title')}</h2>
      {body}
    </section>
  );
}
