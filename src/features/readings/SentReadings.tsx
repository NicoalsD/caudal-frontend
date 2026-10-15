import { useState } from 'react';
import type { JSX } from 'react';
import { CircleCheck } from 'lucide-react';

import type { ClosedItemSummary } from '../../core/commands/summarizeOutbox';
import { formatDateTime } from '../../core/format/time';
import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';
import { useConnection } from '../../state/hooks/useConnection';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { useTanks } from '../../state/hooks/useTanks';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './Readings.module.css';
import { ReadingCorrectionDialog } from './ReadingCorrectionDialog';
import { resolveGauge } from './gaugeRule';

const ICON_SIZE = 20;

/**
 * Readings this phone sent during the session. Each one can be corrected once the server has it
 * (online only). The reading id is the client UUID, so no lookup is needed.
 */
export function SentReadings(): JSX.Element | null {
  const summary = useSyncQueue();
  const sent = summary.closed.filter((item) => item.outcome === 'SENT');
  const [notice, setNotice] = useState<string | null>(null);
  if (sent.length === 0) {
    return null;
  }
  return (
    <section className={cn(styles.review)} aria-label={t('readings.sent.title')}>
      <h2>{t('readings.sent.title')}</h2>
      <p role="status" className={cn(styles.notice)}>
        {notice}
      </p>
      {sent.map((item) => (
        <SentReadingRow
          key={item.clientId}
          item={item}
          onCorrected={() => {
            setNotice(t('readings.sent.correctedNotice'));
          }}
        />
      ))}
    </section>
  );
}

interface SentReadingRowProps {
  readonly item: ClosedItemSummary;
  readonly onCorrected: () => void;
}

function SentReadingRow({ item, onCorrected }: SentReadingRowProps): JSX.Element {
  const [correcting, setCorrecting] = useState(false);
  const connection = useConnection();
  const ruleSet = useCurrentRuleSet();
  const tanks = useTanks();
  const online = connection === 'ONLINE';
  const value = item.gaugeValue;
  const gauge = resolveGauge(
    ruleSet.data?.gauge,
    tanks.data?.find((tank) => tank.id === item.tankId),
  );
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
