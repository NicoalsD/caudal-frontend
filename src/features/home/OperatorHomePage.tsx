import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useLocation } from 'react-router';
import { ChevronUp, CircleCheck, Clock, Circle, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { SectorView, TankView } from '../../services/api/views';
import type { OutboxSummary } from '../../core/commands/summarizeOutbox';
import { minutesUntil, pickShifts } from '../../core/schedule/pickShifts';
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
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { useDaySchedule } from '../closure/closureQueries';
import { AssistantPanel } from '../aqueduct/AssistantPanel';
import { AutopilotModeControl } from '../aqueduct/AutopilotModeControl';
import { LiveAqueduct, SceneMessage } from '../aqueduct/LiveAqueduct';
import { Button } from '../../ui/primitives/Button';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import styles from './OperatorHome.module.css';

/** Hours shown without decimals: the age of a level is a rough figure for the plumber. */
const HOURS_DECIMALS = 0;
const ICON_SIZE = 20;
const PANEL_BODY_ID = 'operator-panel-body';
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
 * Screen S07, the plumber's home. The live 3D scene of the aqueduct fills the screen: the tank, the
 * pipes with their flow and the valves, which can be pressed. Beside it (a bottom sheet on a
 * phone) go the current and next shift, the autopilot mode, the assistant, the valve list and the
 * day's checklist. Every state has an icon and a text, never the color alone. The phone's queue and
 * the actions show even when the tank does not load: the plumber must see what is pending.
 */
export function OperatorHomePage(): JSX.Element {
  const location = useLocation();
  const session = useSession();
  const active = useActiveTank();
  const offline = useOfflineServices();
  const summary = useSyncQueue();
  const [panelOpen, setPanelOpen] = useState(false);
  const name = session.status === 'authenticated' ? session.user.displayName : '';
  const facts = todayFacts(summary, toBogotaDateKey(new Date(offline.clock.nowMs()).toISOString()));

  return (
    <div className={cn(styles.page)}>
      <div className={cn(styles.head)}>
        <div className={cn(styles.titleRow)}>
          <ScreenTitle>{t('home.todayHeading', { date: dayInWords(facts.today) })}</ScreenTitle>
          <p className={cn(styles.greeting)}>{t('home.greeting', { name })}</p>
        </div>
        {readDamageSent(location.state) ? <p role="status">{t('home.damageSent')}</p> : null}
      </div>
      <LiveAqueduct>
        {(parts, live) => (
          <div className={cn(styles.layout)}>
            <section className={cn(styles.scenePane)} aria-label={t('operatorHome.sceneRegion')}>
              {parts === null ? (
                <div className={cn(styles.sceneMessage)}>
                  <SceneMessage live={live} />
                </div>
              ) : (
                parts.scene
              )}
            </section>
            <aside
              className={cn(styles.panel)}
              data-open={panelOpen}
              aria-label={t('operatorHome.panelTitle')}
            >
              <button
                type="button"
                className={cn(styles.sheetHandle)}
                aria-expanded={panelOpen}
                aria-controls={PANEL_BODY_ID}
                onClick={() => {
                  setPanelOpen((open) => !open);
                }}
              >
                <ChevronUp aria-hidden="true" size={ICON_SIZE} className={cn(styles.chevron)} />
                {panelOpen ? t('operatorHome.panelClose') : t('operatorHome.panelOpen')}
              </button>
              <div id={PANEL_BODY_ID} className={cn(styles.panelBody)}>
                <ShiftsNow />
                <AutopilotModeControl />
                <AssistantPanel valves={parts?.aqueduct.valves ?? []} />
                {parts === null ? null : (
                  <section className={cn(styles.block)} aria-labelledby="home-valves-title">
                    <h3 id="home-valves-title">{t('valves.listTitle')}</h3>
                    <p className={cn(styles.muted)}>{t('valves.listHint')}</p>
                    {parts.valveList}
                  </section>
                )}
                {active.status === 'ready' ? (
                  <TankToday tank={active.tank} facts={facts} />
                ) : (
                  <TodayChecklist facts={facts} readingLine={null} />
                )}
                <DayShifts day={facts.today} />
                <div className={cn(styles.secondary)}>
                  <LinkButton to={ROUTE_PATHS.operator.damage}>{t('home.damage')}</LinkButton>
                </div>
              </div>
            </aside>
          </div>
        )}
      </LiveAqueduct>
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
 * The checklist with the tank: its level decides whether today has a reading. While the level
 * loads the checklist still shows, with the reading line as "loading", so no action is hidden.
 */
function TankToday({
  tank,
  facts,
}: {
  readonly tank: TankView;
  readonly facts: TodayFacts;
}): JSX.Element {
  const status = useTankStatus(tank.id);
  const rules = useCurrentRuleSet();
  const levelToday = status.data?.level?.observedAt.dayKey === facts.today;
  const readingDone = facts.queuedToday || levelToday;

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
  const readingMissing = !readingDone && status.isSuccess;
  const staleNote = status.data?.stale.isStale
    ? readingMissing
      ? t('home.staleShort', {
          hours: formatDecimal(status.data.stale.staleAfterHours, HOURS_DECIMALS),
        })
      : t('home.stale', {
          hours: formatDecimal(status.data.stale.staleAfterHours, HOURS_DECIMALS),
        })
    : null;

  return (
    <>
      <section className={cn(styles.block)} aria-labelledby="home-tank-title">
        <h3 id="home-tank-title">{t('home.tankTitle')}</h3>
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
            <p>
              {t('operatorHome.tankFacts', {
                level: formatDecimal(level.value.value),
                hours: formatDecimal(level.hoursAgo, HOURS_DECIMALS),
              })}
            </p>
            {meaning === null ? null : <p>{meaning}</p>}
          </>
        )}
        {staleNote === null ? null : (
          <p className={cn(styles.stale, styles.lineWithIcon)}>
            <Clock aria-hidden="true" size={ICON_SIZE} />
            {staleNote}
          </p>
        )}
        <LinkButton to={ROUTE_PATHS.tank}>{t('home.tankDetail')}</LinkButton>
      </section>
      <TodayChecklist facts={facts} readingLine={readingLine} readingDone={readingDone} />
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
      <section className={cn(styles.card)} aria-labelledby="home-today-title">
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
    <section className={cn(styles.card)} aria-labelledby="home-shifts-title">
      <h2 id="home-shifts-title">{t('home.shiftsTitle')}</h2>
      {body}
    </section>
  );
}

/** How often the countdown is recomputed; the minute is the finest thing it shows. */
const COUNTDOWN_TICK_MS = 15_000;

/** The shift running now (with a countdown to its end) and the next one. */
function ShiftsNow(): JSX.Element {
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
  const { current, next } = pickShifts(spans, nowMs);
  const line = (shift: { sectorId: string; startMs: number; endMs: number }): string =>
    t('operatorHome.shiftLine', {
      sector: sectorName(shift.sectorId),
      start: formatTime(new Date(shift.startMs).toISOString()),
      end: formatTime(new Date(shift.endMs).toISOString()),
    });
  return (
    <section className={cn(styles.block)} aria-labelledby="home-shift-now-title">
      <h3 id="home-shift-now-title">{t('operatorHome.shiftNow')}</h3>
      {current === null ? (
        <p>{t('operatorHome.shiftNoneNow')}</p>
      ) : (
        <>
          <p className={cn(styles.strong)}>{line(current)}</p>
          <p>{t('operatorHome.endsIn', { minutes: String(minutesUntil(current.endMs, nowMs)) })}</p>
        </>
      )}
      <h3>{t('operatorHome.shiftNext')}</h3>
      {next === null ? (
        <p>{t('operatorHome.shiftNoneNext')}</p>
      ) : (
        <>
          <p className={cn(styles.strong)}>{line(next)}</p>
          <p>
            {t('operatorHome.startsIn', { minutes: String(minutesUntil(next.startMs, nowMs)) })}
          </p>
        </>
      )}
    </section>
  );
}
