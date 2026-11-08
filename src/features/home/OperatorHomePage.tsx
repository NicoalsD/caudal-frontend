import type { JSX } from 'react';
import { useLocation } from 'react-router';
import { CircleCheck, Clock, Circle, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';

import type { SectorView, TankStatusView, TankView } from '../../services/api/views';
import type { OutboxSummary } from '../../core/commands/summarizeOutbox';
import { ROUTE_PATHS } from '../../core/session/routes';
import { formatDecimal } from '../../core/format/decimal';
import { formatTime, toBogotaDateKey } from '../../core/format/time';
import { DISPLAY_LOCALE, DISPLAY_TIME_ZONE } from '../../core/policy/clientPolicy';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useActiveTank, useTankStatus } from '../../state/hooks/useTankStatus';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useSectors } from '../../state/hooks/useSectors';
import { useSession } from '../../state/hooks/useSession';
import { TankStage } from '../../ui/tank/TankStage';
import { useIsDesktop } from '../../ui/tank/useIsDesktop';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { useDaySchedule } from '../closure/closureQueries';
import { Button } from '../../ui/primitives/Button';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import styles from './OperatorHome.module.css';

/** Hours shown without decimals: the age of a level is a rough figure for the plumber. */
const HOURS_DECIMALS = 0;
const ICON_SIZE = 20;
const NO_PENDING = 0;
const ONE_PENDING = 1;
/** Bogotá has no daylight saving time, so its offset is fixed; noon keeps the day stable. */
const BOGOTA_NOON = 'T12:00:00-05:00';

const DAY_WORDS_FORMAT = {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
} as const;
const dayWordsFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, DAY_WORDS_FORMAT);

type Tone = 'done' | 'missing' | 'attention' | 'neutral';

const TONE_CLASS: Record<Tone, string | undefined> = {
  done: styles.toneDone,
  missing: styles.toneMissing,
  attention: styles.toneAttention,
  neutral: styles.toneNeutral,
};

/** One line of the day's checklist: its state (icon, text and color together), and its action. */
interface ChecklistLine {
  readonly tone: Tone;
  readonly icon: LucideIcon;
  readonly text: string;
}

/** What the phone knows today. It needs no tank, so it is there even when the tank is not. */
interface TodayFacts {
  readonly today: string;
  /** A reading of today is on the phone (waiting, being sent, or sent in this session). */
  readonly queuedToday: boolean;
  readonly pendingLine: ChecklistLine;
  readonly pendingCount: number;
}

/**
 * Screen S07, the plumber's home. The day in words at the top, then the next step of the day
 * (one main action), the day's checklist and today's shifts, and the level of the tank at a
 * glance. Every state has an icon and a text, never the color alone. The phone's queue and the
 * actions show even when the tank does not load: the plumber must see what is pending.
 */
export function OperatorHomePage(): JSX.Element {
  const location = useLocation();
  const session = useSession();
  const active = useActiveTank();
  const offline = useOfflineServices();
  const summary = useSyncQueue();
  const name = session.status === 'authenticated' ? session.user.displayName : '';
  const facts = todayFacts(summary, toBogotaDateKey(new Date(offline.clock.nowMs()).toISOString()));

  let tank: JSX.Element;
  if (active.status === 'loading') {
    tank = <LoadingState message={t('tankStatus.loading')} />;
  } else if (active.status === 'error') {
    tank = <p role="alert">{t('home.statusError')}</p>;
  } else if (active.status === 'empty') {
    tank = <p>{t('tankStatus.noTank')}</p>;
  } else {
    tank = <></>;
  }

  return (
    <div className={cn(styles.page)}>
      <div className={cn(styles.head)}>
        <div className={cn(styles.titleRow)}>
          <ScreenTitle>{t('home.todayHeading', { date: dayInWords(facts.today) })}</ScreenTitle>
          <p className={cn(styles.greeting)}>{t('home.greeting', { name })}</p>
        </div>
        {readDamageSent(location.state) ? <p role="status">{t('home.damageSent')}</p> : null}
      </div>
      {active.status === 'ready' ? (
        <TankToday tank={active.tank} facts={facts} />
      ) : (
        <>
          <TodayChecklist facts={facts} readingLine={null} />
          <div className={cn(styles.tankArea)}>{tank}</div>
        </>
      )}
      <DayShifts day={facts.today} />
      <div className={cn(styles.secondary, styles.damageArea)}>
        <LinkButton to={ROUTE_PATHS.operator.damage}>{t('home.damage')}</LinkButton>
      </div>
    </div>
  );
}

/** "viernes 6 de noviembre" for a day of America/Bogota given as YYYY-MM-DD. */
function dayInWords(dayKey: string): string {
  const parts = dayWordsFormatter.formatToParts(new Date(`${dayKey}${BOGOTA_NOON}`));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('weekday')} ${part('day')} de ${part('month')}`;
}

/** The damage report page sends the person back here saying the report was sent (S11). */
function readDamageSent(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'damageSent' in state &&
    state.damageSent === true
  );
}

/** True when the item or the sent reading was observed on the given Bogotá day. */
function isObservedOn(observedAt: string | null, dayKey: string): boolean {
  return observedAt !== null && toBogotaDateKey(observedAt) === dayKey;
}

function todayFacts(summary: OutboxSummary, today: string): TodayFacts {
  // Refused readings wait for a correction: they are not a reading of today that is on its way.
  const queuedToday =
    summary.items.some(
      (item) => item.status !== 'CORRECTION_PENDING' && isObservedOn(item.observedAt, today),
    ) ||
    summary.closed.some((item) => item.outcome === 'SENT' && isObservedOn(item.observedAt, today));
  const pendingCount = summary.pendingCount + summary.needsReviewCount;
  let pendingLine: ChecklistLine;
  if (summary.needsReviewCount > NO_PENDING) {
    pendingLine = { tone: 'attention', icon: TriangleAlert, text: t('home.todayReviewNeeded') };
  } else if (pendingCount === NO_PENDING) {
    pendingLine = { tone: 'done', icon: CircleCheck, text: t('home.todayPendingNone') };
  } else {
    pendingLine = {
      tone: 'missing',
      icon: Clock,
      text:
        pendingCount === ONE_PENDING
          ? t('home.todayPendingOne')
          : t('home.todayPending', { count: String(pendingCount) }),
    };
  }
  return { today, queuedToday, pendingLine, pendingCount };
}

/**
 * The home with the tank: its level decides whether today has a reading. While the level loads
 * the checklist still shows, with the reading line as "loading", so no action is hidden.
 */
function TankToday({
  tank,
  facts,
}: {
  readonly tank: TankView;
  readonly facts: TodayFacts;
}): JSX.Element {
  const status = useTankStatus(tank.id);
  const levelToday = status.data?.level?.observedAt.dayKey === facts.today;
  const readingDone = facts.queuedToday || levelToday;
  // Same condition as the "missing" line of the checklist: the tank answered and has no reading.
  const readingMissing = !readingDone && status.isSuccess;

  let readingLine: ChecklistLine;
  if (readingDone) {
    readingLine = { tone: 'done', icon: CircleCheck, text: t('home.todayReadingDone') };
  } else if (status.isPending) {
    readingLine = { tone: 'missing', icon: Clock, text: t('tankStatus.loading') };
  } else if (status.isError) {
    readingLine = { tone: 'attention', icon: TriangleAlert, text: t('home.todayReadingUnknown') };
  } else {
    readingLine = { tone: 'missing', icon: Circle, text: t('home.todayReadingMissing') };
  }

  return (
    <>
      <TodayChecklist facts={facts} readingLine={readingLine} readingDone={readingDone} />
      <TankGlance tank={tank} status={status} readingMissing={readingMissing} />
    </>
  );
}

/**
 * The main action and today's checklist. The main action is the next step of the day: the
 * reading first, then the closure. Without the tank's level, the reading line is left out and
 * the main action is the reading.
 */
function TodayChecklist({
  facts,
  readingLine,
  readingDone = false,
}: {
  readonly facts: TodayFacts;
  readonly readingLine: ChecklistLine | null;
  readonly readingDone?: boolean;
}): JSX.Element {
  const closeToday = ROUTE_PATHS.operator.dayClosure.replace(':date', facts.today);
  const main = readingDone ? (
    <LinkButton variant="primary" to={closeToday}>
      {t('home.closeDay')}
    </LinkButton>
  ) : (
    <LinkButton variant="primary" to={ROUTE_PATHS.operator.newReading}>
      {t('home.newReading')}
    </LinkButton>
  );
  return (
    <>
      <div className={cn(styles.primaryAction)}>{main}</div>
      <section className={cn(styles.card, styles.todayArea)} aria-labelledby="home-today-title">
        <h2 id="home-today-title">{t('home.todayTitle')}</h2>
        <ul className={cn(styles.checklist)}>
          {readingLine === null ? null : (
            <ChecklistRow line={readingLine}>
              {readingDone ? (
                <LinkButton to={ROUTE_PATHS.operator.newReading}>{t('home.newReading')}</LinkButton>
              ) : null}
            </ChecklistRow>
          )}
          <ChecklistRow line={facts.pendingLine}>
            {facts.pendingCount === NO_PENDING ? null : (
              <LinkButton to={ROUTE_PATHS.operator.pending}>{t('home.seePending')}</LinkButton>
            )}
          </ChecklistRow>
          <ChecklistRow line={{ tone: 'neutral', icon: Circle, text: t('home.todayClosureHint') }}>
            <LinkButton to={closeToday}>{t('home.dayClosure')}</LinkButton>
          </ChecklistRow>
        </ul>
      </section>
    </>
  );
}

interface ChecklistRowProps {
  readonly line: ChecklistLine;
  readonly children?: JSX.Element | null;
}

/** One line of today's checklist: icon, text and, when there is one, the action of that line. */
function ChecklistRow({ line, children }: ChecklistRowProps): JSX.Element {
  const Icon = line.icon;
  return (
    <li className={cn(styles.row, TONE_CLASS[line.tone])}>
      <span className={cn(styles.rowText)}>
        <Icon aria-hidden="true" size={ICON_SIZE} />
        <span>{line.text}</span>
      </span>
      {children ?? null}
    </li>
  );
}

/**
 * The shifts of today as published by the Junta, sorted by their sequence. A day with no
 * published schedule (404, null) says so; the rest of the screen keeps working either way.
 */
function DayShifts({ day }: { readonly day: string }): JSX.Element {
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
          <TriangleAlert aria-hidden="true" size={ICON_SIZE} />
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
    const items = [...schedule.data.items].sort((a, b) => a.sequence - b.sequence);
    body = (
      <div className={cn(styles.tableWrap)}>
        <table className={cn(styles.table)} aria-labelledby="home-shifts-title">
          <thead>
            <tr>
              <th scope="col">{t('home.shiftSector')}</th>
              <th scope="col">{t('home.shiftStart')}</th>
              <th scope="col">{t('home.shiftEnd')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{sectorName(item.sectorId)}</td>
                <td>{formatTime(item.startAt.date.toISOString())}</td>
                <td>{formatTime(item.endAt.date.toISOString())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className={cn(styles.card, styles.shiftsArea)} aria-labelledby="home-shifts-title">
      <h2 id="home-shifts-title">{t('home.shiftsTitle')}</h2>
      {body}
    </section>
  );
}

/**
 * The last level of the tank, big, with its age, the gauge beside it (desktop only), what the
 * level means for the service, and a link to the full status. It gets the query from the panel:
 * a second observer would refetch an errored query on mount and loop. The gauge and the sentence
 * wait for the rules; until they load, only the number shows.
 */
function TankGlance({
  tank,
  status,
  readingMissing,
}: {
  readonly tank: TankView;
  readonly status: UseQueryResult<TankStatusView>;
  readonly readingMissing: boolean;
}): JSX.Element {
  const rules = useCurrentRuleSet();
  const level = status.data?.level ?? null;
  const band = status.data?.band ?? null;
  const ruleBand =
    band === null ? undefined : rules.data?.bands.find((item) => item.band === band.code);
  const serviceHours = band?.serviceHours ?? ruleBand?.dailyServiceHours ?? null;

  let meaning: string | null = null;
  if (band !== null && rules.data !== undefined) {
    meaning =
      serviceHours === null
        ? t('home.bandNoHours', { band: bandLabel(band.code) })
        : t('home.bandMeaning', {
            band: bandLabel(band.code),
            hours: formatDecimal(serviceHours, HOURS_DECIMALS),
          });
  }

  const desktop = useIsDesktop();
  const staleNote = status.data?.stale.isStale
    ? readingMissing
      ? t('home.staleShort', {
          hours: formatDecimal(status.data.stale.staleAfterHours, HOURS_DECIMALS),
        })
      : t('home.stale', {
          hours: formatDecimal(status.data.stale.staleAfterHours, HOURS_DECIMALS),
        })
    : null;

  // On a desktop the tank leads the column, as soon as the level and the rules are in.
  if (desktop && level !== null && rules.data !== undefined) {
    return (
      <div className={cn(styles.tankArea)}>
        <TankStage
          heading={t('home.tankTitle')}
          level={level.value.value}
          gaugeMin={tank.gaugeMin}
          gaugeMax={tank.gaugeMax}
          capacityLiters={tank.capacityLiters}
          bands={rules.data.bands.map((item) => ({
            code: item.band,
            from: item.minLevel,
            to: item.maxLevel,
          }))}
          reserveLevel={rules.data.reserveLevel}
        >
          <div className={cn(styles.stageNotes)}>
            {meaning === null ? null : <p>{meaning}</p>}
            <p>{t('home.levelAge', { hours: formatDecimal(level.hoursAgo, HOURS_DECIMALS) })}</p>
            {staleNote === null ? null : (
              <p className={cn(styles.stageStale)}>
                <Clock aria-hidden="true" size={ICON_SIZE} />
                {staleNote}
              </p>
            )}
            <LinkButton to={ROUTE_PATHS.tank}>{t('home.tankDetail')}</LinkButton>
          </div>
        </TankStage>
      </div>
    );
  }

  return (
    <div className={cn(styles.tankArea)}>
      <section className={cn(styles.card, styles.tankCard)} aria-labelledby="home-tank-title">
        <h2 id="home-tank-title">{t('home.tankTitle')}</h2>
        {status.isPending ? <LoadingState message={t('tankStatus.loading')} /> : null}
        {status.isError ? (
          <div>
            <p role="alert">{t('home.statusError')}</p>
            <Button onClick={() => void status.refetch()}>{t('common.retry')}</Button>
          </div>
        ) : null}
        {status.data === undefined ? null : level === null ? (
          <p>{t('tankStatus.noLevel')}</p>
        ) : (
          <>
            <p className={cn(styles.level)}>
              {t('home.levelValue', { value: formatDecimal(level.value.value) })}
            </p>
            {meaning === null ? null : <p>{meaning}</p>}
            <p>{t('home.levelAge', { hours: formatDecimal(level.hoursAgo, HOURS_DECIMALS) })}</p>
          </>
        )}
        {staleNote === null ? null : <p className={cn(styles.stale)}>{staleNote}</p>}
        <LinkButton to={ROUTE_PATHS.tank}>{t('home.tankDetail')}</LinkButton>
      </section>
    </div>
  );
}
