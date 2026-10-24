import { useState } from 'react';
import type { JSX } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

import type { OutboxItemSummary } from '../../core/commands/summarizeOutbox';
import { formatDateTime } from '../../core/format/time';
import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';
import { useConnection } from '../../state/hooks/useConnection';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useOutboxOwner } from '../../state/hooks/useOutboxOwner';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { Button } from '../../ui/primitives/Button';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { ROUTE_PATHS } from '../../core/session/routes';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import styles from './Readings.module.css';
import { ReadingIssueCard } from './ReadingIssues';
import { SentReadingRow } from './SentReadingRow';

const ICON_SIZE = 20;
const NO_SENT = 0;
const ONE_READING = 1;

/** "3 lecturas enviadas." after a send; the one-reading form has its own text. */
function sentNoticeText(sentNow: number): string {
  if (sentNow === NO_SENT) {
    return t('pending.nothingSent');
  }
  return sentNow === ONE_READING
    ? t('pending.sentOne')
    : t('pending.sentCount', { count: String(sentNow) });
}

/** Readings this phone sent in the session. The owner's own list is read, never anyone else's. */
function countSent(sent: readonly { outcome: string }[]): number {
  return sent.filter((item) => item.outcome === 'SENT').length;
}

/**
 * Screen S09: what is on the phone and has not reached the server. Refused readings are fixed or
 * discarded here; sent readings can be corrected while the phone is online.
 */
export function PendingReadingsPage(): JSX.Element {
  const offline = useOfflineServices();
  const owner = useOutboxOwner();
  const summary = useSyncQueue();
  const connection = useConnection();
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const online = connection === 'ONLINE';

  const queued = summary.items.filter((item) => item.status !== 'CORRECTION_PENDING');
  const review = summary.items.filter((item) => item.status === 'CORRECTION_PENDING');
  const sent = summary.closed.filter((item) => item.outcome === 'SENT');
  const openCount = queued.length + review.length;

  const sendNow = async (): Promise<void> => {
    const before = countSent(offline.outbox.closedFor(owner));
    setSending(true);
    try {
      await offline.sync.flush({ ignoreBackoff: true });
    } catch {
      // The queue keeps every item: a failed send is tried again later.
    }
    const sentNow = countSent(offline.outbox.closedFor(owner)) - before;
    setSending(false);
    setNotice(sentNoticeText(sentNow));
  };

  // Only the readings still waiting in the queue are "por enviar"; the ones to review are not.
  const queuedCount = queued.length;
  const summaryLine =
    queuedCount === 0
      ? null
      : queuedCount === ONE_READING
        ? online
          ? t('pending.pageSummaryOne')
          : t('pending.offlineSummaryOne')
        : online
          ? t('pending.pageSummary', { count: String(queuedCount) })
          : t('pending.offlineSummary', { count: String(queuedCount) });

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.pendingReadings')}</ScreenTitle>
      {openCount === 0 ? (
        <>
          <p>{t('pending.empty')}</p>
          <p className={cn(styles.help)}>{t('pending.emptyHelp')}</p>
          <div className={cn(styles.actions)}>
            <LinkButton variant="primary" to={ROUTE_PATHS.operator.newReading}>
              {t('home.newReading')}
            </LinkButton>
          </div>
        </>
      ) : (
        <>
          {summaryLine === null ? null : <p>{summaryLine}</p>}
          {queuedCount === 0 ? null : (
            <>
              <p className={cn(styles.help)}>
                {t('pending.autoSend')} {online ? t('pending.retryHelp') : t('pending.waitingHelp')}
              </p>
              <div className={cn(styles.actions)}>
                <Button
                  variant="primary"
                  disabled={!online || sending}
                  onClick={() => void sendNow()}
                >
                  {sending
                    ? t('pending.sending')
                    : online
                      ? t('pending.sendNow')
                      : t('pending.waitingSignal')}
                </Button>
              </div>
            </>
          )}
        </>
      )}
      <p role="status" className={cn(styles.notice)}>
        {notice}
      </p>
      {queued.length === 0 ? null : (
        <ul className={cn(styles.list)}>
          {queued.map((item) => (
            <li key={item.clientId}>
              <QueuedReadingRow item={item} />
            </li>
          ))}
        </ul>
      )}
      {review.length === 0 ? null : (
        <section aria-label={t('readings.review.title')} className={cn(styles.list)}>
          <h2>{t('readings.review.title')}</h2>
          {review.map((item) => (
            <ReadingIssueCard key={item.clientId} item={item} />
          ))}
        </section>
      )}
      {sent.length === 0 ? null : (
        <section aria-label={t('pending.sentTitle')} className={cn(styles.list)}>
          <h2>{t('pending.sentTitle')}</h2>
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
      )}
    </div>
  );
}

/** A reading still on the phone: waiting or being sent. Values come from the stored payload. */
function QueuedReadingRow({ item }: { readonly item: OutboxItemSummary }): JSX.Element {
  const sending = item.status === 'SENDING';
  return (
    <article className={cn(styles.issue)}>
      <p className={cn(styles.issueTitle)}>
        {item.observedAt === null
          ? t('readings.review.unknownDate')
          : t('readings.review.observedAt', { date: formatDateTime(item.observedAt) })}
      </p>
      {item.gaugeValue === null ? null : (
        <p>{t('pending.value', { value: formatDecimal(item.gaugeValue) })}</p>
      )}
      <p className={cn(styles.issueStatus)}>
        {sending ? (
          <RefreshCw aria-hidden="true" size={ICON_SIZE} />
        ) : (
          <Clock aria-hidden="true" size={ICON_SIZE} />
        )}
        <span>{sending ? t('pending.status.sending') : t('pending.status.pending')}</span>
      </p>
    </article>
  );
}
