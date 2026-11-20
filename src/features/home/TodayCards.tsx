import type { JSX } from 'react';
import {
  CircleCheck,
  Circle,
  ClipboardCheck,
  Clock,
  Droplets,
  NotebookPen,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { TankView } from '../../services/api/views';
import type { OutboxSummary } from '../../core/commands/summarizeOutbox';
import { ROUTE_PATHS } from '../../core/session/routes';
import { formatDecimal } from '../../core/format/decimal';
import { toBogotaDateKey } from '../../core/format/time';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useTankStatus } from '../../state/hooks/useTankStatus';
import { Card } from '../../ui/cards/Card';
import { Button } from '../../ui/primitives/Button';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { Link } from 'react-router';
import { cn } from '../../ui/styles/cn';
import styles from './OperatorHome.module.css';

/** Hours shown without decimals: the age of a level is a rough figure for the plumber. */
const HOURS_DECIMALS = 0;
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
export interface ChecklistLine {
  readonly tone: Tone;
  readonly icon: LucideIcon;
  readonly text: string;
}

/** What the phone knows today. It needs no tank, so it is there even when the tank is not. */
export interface TodayFacts {
  readonly today: string;
  /** A reading of today is on the phone (waiting, being sent, or sent in this session). */
  readonly queuedToday: boolean;
  readonly pendingLine: ChecklistLine;
  readonly pendingCount: number;
}

/** True when the item or the sent reading was observed on the given Bogotá day. */
function isObservedOn(observedAt: string | null, dayKey: string): boolean {
  return observedAt !== null && toBogotaDateKey(observedAt) === dayKey;
}

export function todayFacts(summary: OutboxSummary, today: string): TodayFacts {
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

type TodayPart = 'quick' | 'tank' | 'check';

/**
 * One block of the day, drawn from the tank's level: which decides whether today has a reading.
 * `quick` is the main action and the damage report, `tank` the last level, `check` the checklist.
 * While the level loads the checklist still shows, with the reading line as "loading", so no
 * action is hidden. Without a tank (`tank` null) the reading line is left out and the main action
 * is the reading.
 */
export function TodayBlock({
  tank,
  facts,
  part,
}: {
  readonly tank: TankView | null;
  readonly facts: TodayFacts;
  readonly part: TodayPart;
}): JSX.Element {
  if (tank === null) {
    return part === 'quick' ? (
      <QuickActions facts={facts} readingDone={false} />
    ) : part === 'check' ? (
      <Checklist facts={facts} readingLine={null} readingDone={false} />
    ) : (
      <></>
    );
  }
  return <TankBlock tank={tank} facts={facts} part={part} />;
}

function TankBlock({
  tank,
  facts,
  part,
}: {
  readonly tank: TankView;
  readonly facts: TodayFacts;
  readonly part: TodayPart;
}): JSX.Element {
  const status = useTankStatus(tank.id);
  const rules = useCurrentRuleSet();
  const levelToday = status.data?.level?.observedAt.dayKey === facts.today;
  const readingDone = facts.queuedToday || levelToday;

  if (part === 'quick') {
    return <QuickActions facts={facts} readingDone={readingDone} />;
  }

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
  if (part === 'check') {
    return <Checklist facts={facts} readingLine={readingLine} readingDone={readingDone} />;
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
    <Card
      variant="tinted"
      tint="aqua"
      as="section"
      aria-labelledby="home-tank-title"
      className={cn(styles.tankCard)}
    >
      <h2 id="home-tank-title" className={cn(styles.cardHeading)}>
        <Droplets aria-hidden="true" />
        {t('home.tankTitle')}
      </h2>
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
          <p className={cn(styles.bigLevel)}>
            {t('home.levelValue', { value: formatDecimal(level.value.value) })}
          </p>
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
          <Clock aria-hidden="true" />
          {staleNote}
        </p>
      )}
      <LinkButton to={ROUTE_PATHS.tank}>{t('home.tankDetail')}</LinkButton>
    </Card>
  );
}

/**
 * The big buttons of the day. The main action is the next step: the reading first, then the
 * closure. The damage report is always one tap away.
 */
function QuickActions({
  facts,
  readingDone,
}: {
  readonly facts: TodayFacts;
  readonly readingDone: boolean;
}): JSX.Element {
  const closeToday = ROUTE_PATHS.operator.dayClosure.replace(':date', facts.today);
  const main = readingDone ? (
    <LinkButton variant="primary" to={closeToday} className={cn(styles.quickButton)}>
      <ClipboardCheck aria-hidden="true" />
      {t('home.closeDay')}
    </LinkButton>
  ) : (
    <LinkButton
      variant="primary"
      to={ROUTE_PATHS.operator.newReading}
      className={cn(styles.quickButton)}
    >
      <NotebookPen aria-hidden="true" />
      {t('home.newReading')}
    </LinkButton>
  );
  return (
    <section className={cn(styles.quick)} aria-label={t('operatorHome.quickActions')}>
      {main}
      <LinkButton to={ROUTE_PATHS.operator.damage} className={cn(styles.quickButton)}>
        <Wrench aria-hidden="true" />
        {t('home.damage')}
      </LinkButton>
    </section>
  );
}

/** Today's checklist: each line has its state (icon, text and color together) and its action. */
function Checklist({
  facts,
  readingLine,
  readingDone,
}: {
  readonly facts: TodayFacts;
  readonly readingLine: ChecklistLine | null;
  readonly readingDone: boolean;
}): JSX.Element {
  const closeToday = ROUTE_PATHS.operator.dayClosure.replace(':date', facts.today);
  return (
    <Card as="section" aria-labelledby="home-today-title" className={cn(styles.checkCard)}>
      <h2 id="home-today-title" className={cn(styles.sectionTitle)}>
        {t('home.todayTitle')}
      </h2>
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
    </Card>
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
        <Icon aria-hidden="true" />
        <span>{line.text}</span>
      </span>
      {children ?? null}
    </li>
  );
}

/**
 * The readings still on the phone, in one line with its link, only when there are some. When the
 * queue is empty there is nothing to say, so nothing is shown.
 */
export function PendingNotice({ facts }: { readonly facts: TodayFacts }): JSX.Element | null {
  if (facts.pendingCount === NO_PENDING) {
    return null;
  }
  const Icon = facts.pendingLine.icon;
  return (
    <p
      className={cn(styles.lineWithIcon, styles.pendingNotice, TONE_CLASS[facts.pendingLine.tone])}
    >
      <Icon aria-hidden="true" />
      <span>{facts.pendingLine.text}</span>
      <Link to={ROUTE_PATHS.operator.pending} className={cn(styles.pendingLink)}>
        {t('home.seePending')}
      </Link>
    </p>
  );
}
