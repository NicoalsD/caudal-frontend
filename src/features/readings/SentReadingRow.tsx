import { useState } from 'react';
import type { JSX } from 'react';
import { CircleCheck } from 'lucide-react';

import type { ClosedItemSummary } from '../../core/commands/summarizeOutbox';
import { formatDateTime } from '../../core/format/time';
import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';
import { useConnection } from '../../state/hooks/useConnection';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './Readings.module.css';
import { ReadingCorrectionDialog } from './ReadingCorrectionDialog';
import { useGaugeForTank } from './ReadingIssues';

const ICON_SIZE = 20;

interface SentReadingRowProps {
  readonly item: ClosedItemSummary;
  readonly onCorrected: () => void;
}

/**
 * A reading this phone sent during the session. It can be corrected once the server has it (online
 * only). The reading id is the client UUID it was sent with, so no lookup is needed.
 */
export function SentReadingRow({ item, onCorrected }: SentReadingRowProps): JSX.Element {
  const [correcting, setCorrecting] = useState(false);
  const connection = useConnection();
  const gauge = useGaugeForTank(item.tankId);
  const online = connection === 'ONLINE';
  const value = item.gaugeValue;
  return (
    <article className={cn(styles.issue)}>
      <p className={cn(styles.issueTitle)}>
        {item.observedAt === null
          ? t('readings.review.unknownDate')
          : t('readings.sent.observedAt', { date: formatDateTime(item.observedAt) })}
      </p>
      <p className={cn(styles.issueStatus)}>
        <CircleCheck aria-hidden="true" size={ICON_SIZE} />
        <span>{t('readings.sent.status')}</span>
      </p>
      {value === null ? null : <p>{t('readings.sent.value', { value: formatDecimal(value) })}</p>}
      {online ? null : <p>{t('readings.sent.offline')}</p>}
      <div className={cn(styles.actions)}>
        <ReadingCorrectionDialog
          readingId={item.clientId}
          currentValue={value ?? 0}
          gauge={gauge}
          open={correcting}
          onOpenChange={setCorrecting}
          onCorrected={onCorrected}
          trigger={
            <Button disabled={!online || value === null}>{t('readings.sent.correct')}</Button>
          }
        />
      </div>
    </article>
  );
}
