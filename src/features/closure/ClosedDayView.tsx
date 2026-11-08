import type { JSX } from 'react';

import { formatTime } from '../../core/format/time';
import type { ShiftStatus } from '../../core/execution/shiftExecution';
import { t } from '../../i18n/t';
import type { DayClosureView, DayShiftView } from '../../services/api/views';
import { Card } from '../../ui/cards/Card';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Badge } from '../../ui/primitives/Badge';
import type { BadgeTone } from '../../ui/primitives/Badge';
import { cn } from '../../ui/styles/cn';
import styles from './DayClosure.module.css';

/** The words of each status, for the read-only view. */
const STATUS_TEXT = {
  COMPLETED: 'closure.statusCompleted',
  PARTIAL: 'closure.statusPartial',
  NOT_EXECUTED: 'closure.statusNotExecuted',
} as const satisfies Readonly<Record<ShiftStatus, string>>;

const STATUS_TONE: Readonly<Record<ShiftStatus, BadgeTone>> = {
  COMPLETED: 'ok',
  PARTIAL: 'warning',
  NOT_EXECUTED: 'error',
};

interface ClosedDayViewProps {
  readonly closure: DayClosureView;
  readonly items: readonly DayShiftView[];
  readonly sectorNames: ReadonlyMap<string, string>;
}

/**
 * The day once it is closed (S10, read-only): when it closed, its note, and how each shift went.
 * Nothing here can be changed: an execution is never edited and a closed day takes no more.
 */
export function ClosedDayView({ closure, items, sectorNames }: ClosedDayViewProps): JSX.Element {
  const statusByItem = new Map(
    closure.executions.map((execution) => [execution.scheduleItemId, execution.status]),
  );
  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('closure.closedTitle')}</ScreenTitle>
      <p role="status" className={cn(styles.cardHours)}>
        {t('closure.closedReadOnly')}
      </p>
      <Card
        variant="tinted"
        tint="mint"
        as="section"
        className={cn(styles.card)}
        aria-labelledby="closed-day-summary"
      >
        <h2 id="closed-day-summary" className={cn(styles.cardTitle)}>
          {t('closure.closedAt', { date: closure.closedAt.text })}
        </h2>
        <h3 className={cn(styles.cardSubtitle)}>{t('closure.closedNotes')}</h3>
        <p>
          {closure.notes === null || closure.notes === ''
            ? t('closure.closedNoNotes')
            : closure.notes}
        </p>
      </Card>
      <section className={cn(styles.stack)} aria-label={t('closure.closedExecutions')}>
        {items.map((item) => {
          const status = statusByItem.get(item.id);
          return (
            <Card key={item.id} as="article" className={cn(styles.card)}>
              <div className={cn(styles.cardHead)}>
                <h3 className={cn(styles.cardTitle)}>
                  {sectorNames.get(item.sectorId) ?? t('closure.unknownSector')}
                </h3>
                {status === undefined ? null : (
                  <Badge tone={STATUS_TONE[status]}>{t(STATUS_TEXT[status])}</Badge>
                )}
              </div>
              <p className={cn(styles.cardHours)}>
                {t('closure.shiftHours', {
                  start: formatTime(item.startAt.date.toISOString()),
                  end: formatTime(item.endAt.date.toISOString()),
                })}
              </p>
              {status === undefined ? <p>{t('closure.closedNoStatus')}</p> : null}
            </Card>
          );
        })}
      </section>
    </div>
  );
}
