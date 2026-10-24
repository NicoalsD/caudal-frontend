import type { JSX } from 'react';
import { useLocation } from 'react-router';
import { CircleCheck, Clock, Circle, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';

import type { TankStatusView } from '../../services/api/views';
import type { OutboxSummary } from '../../core/commands/summarizeOutbox';
import { ROUTE_PATHS } from '../../core/session/routes';
import { formatDecimal } from '../../core/format/decimal';
import { toBogotaDateKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import { useActiveTank, useTankStatus } from '../../state/hooks/useTankStatus';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useSession } from '../../state/hooks/useSession';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
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
 * Screen S07, the plumber's home. One main action at the top (the next thing the day needs), the
 * day as a short checklist, and the level of the tank at a glance. Every state has an icon and a
 * text, never the color alone. The phone's queue and the actions show even when the tank does not
 * load: the plumber must see what is pending.
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
    tank = <TankToday tankId={active.tank.id} facts={facts} />;
  }

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.operatorHome')}</ScreenTitle>
      <p>{t('home.greeting', { name })}</p>
      {readDamageSent(location.state) ? <p role="status">{t('home.damageSent')}</p> : null}
      {active.status === 'ready' ? null : <TodayChecklist facts={facts} readingLine={null} />}
      {tank}
    </div>
  );
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
  tankId,
  facts,
}: {
  readonly tankId: string;
  readonly facts: TodayFacts;
}): JSX.Element {
  const status = useTankStatus(tankId);
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

  return (
    <>
      <TodayChecklist facts={facts} readingLine={readingLine} readingDone={readingDone} />
      <TankGlance status={status} />
      <div className={cn(styles.secondary)}>
        <LinkButton to={ROUTE_PATHS.operator.damage}>{t('home.damage')}</LinkButton>
      </div>
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
 * The last level of the tank, big, with its age and a link to the full status. It gets the query
 * from the panel: a second observer would refetch an errored query on mount and loop.
 */
function TankGlance({ status }: { readonly status: UseQueryResult<TankStatusView> }): JSX.Element {
  return (
    <section className={cn(styles.card)} aria-labelledby="home-tank-title">
      <h2 id="home-tank-title">{t('home.tankTitle')}</h2>
      {status.isPending ? <LoadingState message={t('tankStatus.loading')} /> : null}
      {status.isError ? (
        <div>
          <p role="alert">{t('home.statusError')}</p>
          <Button onClick={() => void status.refetch()}>{t('common.retry')}</Button>
        </div>
      ) : null}
      {status.data === undefined ? null : status.data.level === null ? (
        <p>{t('tankStatus.noLevel')}</p>
      ) : (
        <>
          <p className={cn(styles.level)}>
            {t('home.levelValue', { value: formatDecimal(status.data.level.value.value) })}
          </p>
          <p>
            {t('home.levelAge', {
              hours: formatDecimal(status.data.level.hoursAgo, HOURS_DECIMALS),
            })}
          </p>
        </>
      )}
      {status.data?.stale.isStale ? (
        <p className={cn(styles.stale)}>
          {t('home.stale', {
            hours: formatDecimal(status.data.stale.staleAfterHours, HOURS_DECIMALS),
          })}
        </p>
      ) : null}
      <LinkButton to={ROUTE_PATHS.tank}>{t('home.tankDetail')}</LinkButton>
    </section>
  );
}
