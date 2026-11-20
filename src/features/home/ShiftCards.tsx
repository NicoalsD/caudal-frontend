import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { TriangleAlert } from 'lucide-react';

import { formatTime } from '../../core/format/time';
import { t } from '../../i18n/t';
import type { SectorView } from '../../services/api/views';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useSectors } from '../../state/hooks/useSectors';
import { useDaySchedule } from '../closure/closureQueries';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './OperatorHome.module.css';

/** How often the countdown is recomputed; the minute is the finest thing it shows. */
const COUNTDOWN_TICK_MS = 15_000;
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;

/** "1 h 25 min" or "25 min": the time left, in the biggest unit that fits. */
function countdownText(minutes: number): string {
  return minutes >= MINUTES_PER_HOUR
    ? t('operatorHome.countdownHours', {
        hours: String(Math.floor(minutes / MINUTES_PER_HOUR)),
        minutes: String(minutes % MINUTES_PER_HOUR),
      })
    : t('operatorHome.countdownMinutes', { minutes: String(minutes) });
}

/** The clock of the screen, kept fresh while it is open. */
function useNow(): number {
  const offline = useOfflineServices();
  const [nowMs, setNowMs] = useState(() => offline.clock.nowMs());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(offline.clock.nowMs());
    }, COUNTDOWN_TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [offline]);
  return nowMs;
}

/**
 * Today's shifts as a short list: the time, the sector and its state in a word (done, running,
 * upcoming). It replaces the table on the home: three columns of text read faster as one line.
 */
export function ShiftList({ day }: { readonly day: string }): JSX.Element {
  const nowMs = useNow();
  const schedule = useDaySchedule(day);
  const sectors = useSectors();
  const sectorName = (sectorId: string): string =>
    sectors.data?.find((sector: SectorView) => sector.id === sectorId)?.name ??
    t('home.shiftSectorUnknown');

  if (schedule.isPending) {
    return schedule.fetchStatus === 'paused' ? (
      <p className={cn(styles.muted)}>{t('home.shiftsOffline')}</p>
    ) : (
      <LoadingState message={t('home.shiftsLoading')} />
    );
  }
  if (schedule.isError) {
    return (
      <div className={cn(styles.inline)}>
        <p className={cn(styles.toneAttention, styles.lineWithIcon)}>
          <TriangleAlert aria-hidden="true" />
          <span>{t('home.shiftsError')}</span>
        </p>
        <Button onClick={() => void schedule.refetch()}>{t('common.retry')}</Button>
      </div>
    );
  }
  const items = [...(schedule.data?.items ?? [])].sort((a, b) => a.sequence - b.sequence);
  if (items.length === 0) {
    return <p className={cn(styles.muted)}>{t('home.shiftsEmpty')}</p>;
  }
  return (
    <ul className={cn(styles.shiftList)} aria-label={t('home.shiftsTitle')}>
      {items.map((item) => {
        const startMs = item.startAt.date.getTime();
        const endMs = item.endAt.date.getTime();
        const state =
          endMs <= nowMs ? 'done' : startMs <= nowMs ? 'running' : ('upcoming' as const);
        return (
          <li key={item.id} className={cn(styles.shiftRow)} data-state={state}>
            <span className={cn(styles.shiftTime)}>
              {t('home.shiftRange', {
                start: formatTime(new Date(startMs).toISOString()),
                end: formatTime(new Date(endMs).toISOString()),
              })}
            </span>
            <span className={cn(styles.shiftSector)}>{sectorName(item.sectorId)}</span>
            <span className={cn(styles.shiftState)}>
              {state === 'done'
                ? t('home.shiftDone')
                : state === 'running'
                  ? t('home.shiftRunningLeft', {
                      left: countdownText(Math.ceil((endMs - nowMs) / MS_PER_MINUTE)),
                    })
                  : t('home.shiftUpcoming')}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
