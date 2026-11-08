import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { CalendarClock, Clock, TriangleAlert } from 'lucide-react';

import { minutesUntil, pickShifts } from '../../core/schedule/pickShifts';
import { formatTime, toBogotaDateKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import type { SectorView } from '../../services/api/views';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useSectors } from '../../state/hooks/useSectors';
import { useDaySchedule } from '../closure/closureQueries';
import { Card } from '../../ui/cards/Card';
import type { Tint } from '../../ui/cards/Card';
import { CardStack } from '../../ui/cards/CardStack';
import type { StackItem } from '../../ui/cards/CardStack';
import { DataTable } from '../../ui/data/DataTable';
import type { DataColumn } from '../../ui/data/DataTable';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { cn } from '../../ui/styles/cn';
import styles from './OperatorHome.module.css';

/** How often the countdown is recomputed; the minute is the finest thing it shows. */
const COUNTDOWN_TICK_MS = 15_000;
const MINUTES_PER_HOUR = 60;
const UPCOMING_TINTS: readonly Tint[] = ['aqua', 'cream', 'sand', 'lavender'];

interface Span {
  readonly sectorId: string;
  readonly startMs: number;
  readonly endMs: number;
}

/** "1 h 25 min" or "25 min": the time left, in the biggest unit that fits. */
function countdownText(minutes: number): string {
  return minutes >= MINUTES_PER_HOUR
    ? t('operatorHome.countdownHours', {
        hours: String(Math.floor(minutes / MINUTES_PER_HOUR)),
        minutes: String(minutes % MINUTES_PER_HOUR),
      })
    : t('operatorHome.countdownMinutes', { minutes: String(minutes) });
}

/** The clock of the screen, kept fresh while it is open, and the day it points to. */
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

function useShiftSpans(nowMs: number): {
  readonly spans: readonly Span[];
  readonly sectorName: (sectorId: string) => string;
} {
  const day = toBogotaDateKey(new Date(nowMs).toISOString());
  const schedule = useDaySchedule(day);
  const sectors = useSectors();
  const sectorName = (sectorId: string): string =>
    sectors.data?.find((sector: SectorView) => sector.id === sectorId)?.name ??
    t('home.shiftSectorUnknown');
  const spans = (schedule.data?.items ?? []).map((item) => ({
    sectorId: item.sectorId,
    startMs: item.startAt.date.getTime(),
    endMs: item.endAt.date.getTime(),
  }));
  return { spans, sectorName };
}

/**
 * The shift running now, as a pastel card with the time left in large type, and the next shift
 * under it. Without a shift the card says so in a calm line.
 */
export function ShiftNowCard(): JSX.Element {
  const nowMs = useNow();
  const { spans, sectorName } = useShiftSpans(nowMs);
  const { current, next } = pickShifts(spans, nowMs);
  const range = (shift: Span): string =>
    t('operatorHome.shiftLine', {
      sector: sectorName(shift.sectorId),
      start: formatTime(new Date(shift.startMs).toISOString()),
      end: formatTime(new Date(shift.endMs).toISOString()),
    });
  return (
    <Card
      variant="tinted"
      tint="mint"
      as="section"
      aria-labelledby="home-shift-now-title"
      className={cn(styles.nowCard)}
    >
      <h2 id="home-shift-now-title" className={cn(styles.cardHeading)}>
        <CalendarClock aria-hidden="true" />
        {t('operatorHome.shiftNow')}
      </h2>
      {current === null ? (
        <p className={cn(styles.calm)}>{t('operatorHome.shiftNoneNow')}</p>
      ) : (
        <>
          <p className={cn(styles.countdown)}>
            {countdownText(minutesUntil(current.endMs, nowMs))}
          </p>
          <p className={cn(styles.muted)}>{t('operatorHome.shiftNowCaption')}</p>
          <p className={cn(styles.strong)}>{range(current)}</p>
          <p className={cn(styles.visuallyHidden)}>
            {t('operatorHome.endsIn', { minutes: String(minutesUntil(current.endMs, nowMs)) })}
          </p>
        </>
      )}
      <h3 className={cn(styles.subHeading)}>{t('operatorHome.shiftNext')}</h3>
      {next === null ? (
        <p className={cn(styles.muted)}>{t('operatorHome.shiftNoneNext')}</p>
      ) : (
        <>
          <p className={cn(styles.strong)}>{range(next)}</p>
          <p className={cn(styles.muted)}>
            {t('operatorHome.startsIn', { minutes: String(minutesUntil(next.startMs, nowMs)) })}
          </p>
        </>
      )}
    </Card>
  );
}

/** The shifts still to come today as a fan of cards: one per sector, with the time to wait. */
export function UpcomingShifts(): JSX.Element | null {
  const nowMs = useNow();
  const { spans, sectorName } = useShiftSpans(nowMs);
  const upcoming = spans
    .filter((span) => span.startMs > nowMs)
    .sort((a, b) => a.startMs - b.startMs);
  if (upcoming.length === 0) {
    return null;
  }
  const items: StackItem[] = upcoming.map((span, position) => {
    const start = formatTime(new Date(span.startMs).toISOString());
    return {
      id: `${span.sectorId}-${String(span.startMs)}`,
      label: t('operatorHome.upcomingLabel', { sector: sectorName(span.sectorId), start }),
      content: (
        <Card
          variant="tinted"
          tint={UPCOMING_TINTS[position % UPCOMING_TINTS.length] ?? 'aqua'}
          className={cn(styles.upcomingCard)}
        >
          <Chip icon={<Clock aria-hidden="true" />}>
            {t('operatorHome.upcomingStartsIn', {
              time: countdownText(minutesUntil(span.startMs, nowMs)),
            })}
          </Chip>
          <p className={cn(styles.upcomingName)}>{sectorName(span.sectorId)}</p>
          <p className={cn(styles.muted)}>
            {t('operatorHome.shiftLine', {
              sector: sectorName(span.sectorId),
              start,
              end: formatTime(new Date(span.endMs).toISOString()),
            })}
          </p>
        </Card>
      ),
    };
  });
  return (
    <section className={cn(styles.block)} aria-labelledby="home-upcoming-title">
      <h2 id="home-upcoming-title" className={cn(styles.sectionTitle)}>
        {t('operatorHome.upcomingTitle')}
      </h2>
      <CardStack label={t('operatorHome.upcomingTitle')} items={items} />
    </section>
  );
}

interface ShiftRow {
  readonly id: string;
  readonly sector: string;
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * The shifts of today as published by the Junta, sorted by their sequence, in a clean table with
 * the state of each one. A day with no published schedule (404, null) says so; the rest of the
 * screen keeps working either way.
 */
export function DayShifts({ day }: { readonly day: string }): JSX.Element {
  const nowMs = useNow();
  const schedule = useDaySchedule(day);
  const sectors = useSectors();
  const sectorName = (sectorId: string): string =>
    sectors.data?.find((sector: SectorView) => sector.id === sectorId)?.name ??
    t('home.shiftSectorUnknown');

  let body: JSX.Element;
  if (schedule.isPending) {
    body =
      schedule.fetchStatus === 'paused' ? (
        <p>{t('home.shiftsOffline')}</p>
      ) : (
        <LoadingState message={t('home.shiftsLoading')} />
      );
  } else if (schedule.isError) {
    body = (
      <div className={cn(styles.inline)}>
        <p className={cn(styles.toneAttention, styles.lineWithIcon)}>
          <TriangleAlert aria-hidden="true" />
          <span>{t('home.shiftsError')}</span>
        </p>
        <Button onClick={() => void schedule.refetch()}>{t('common.retry')}</Button>
      </div>
    );
  } else if (
    schedule.data === null ||
    schedule.data === undefined ||
    schedule.data.items.length === 0
  ) {
    body = <p>{t('home.shiftsEmpty')}</p>;
  } else {
    const rows: ShiftRow[] = [...schedule.data.items]
      .sort((a, b) => a.sequence - b.sequence)
      .map((item) => ({
        id: item.id,
        sector: sectorName(item.sectorId),
        startMs: item.startAt.date.getTime(),
        endMs: item.endAt.date.getTime(),
      }));
    const columns: DataColumn<ShiftRow>[] = [
      { id: 'sector', header: t('home.shiftSector'), cell: (row) => row.sector },
      {
        id: 'start',
        header: t('home.shiftStart'),
        cell: (row) => formatTime(new Date(row.startMs).toISOString()),
      },
      {
        id: 'end',
        header: t('home.shiftEnd'),
        cell: (row) => formatTime(new Date(row.endMs).toISOString()),
      },
      {
        id: 'state',
        header: t('home.shiftStatus'),
        align: 'end',
        cell: (row) =>
          row.endMs <= nowMs ? (
            <Chip>{t('home.shiftDone')}</Chip>
          ) : row.startMs <= nowMs ? (
            <Chip tone="mint">{t('home.shiftRunning')}</Chip>
          ) : (
            <Chip tone="sand">{t('home.shiftUpcoming')}</Chip>
          ),
      },
    ];
    body = (
      <DataTable
        caption={t('home.shiftsTitle')}
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
      />
    );
  }

  return (
    <Card as="section" aria-labelledby="home-shifts-title" className={cn(styles.tableCard)}>
      <h2 id="home-shifts-title" className={cn(styles.sectionTitle)}>
        {t('home.shiftsTitle')}
      </h2>
      {body}
    </Card>
  );
}
