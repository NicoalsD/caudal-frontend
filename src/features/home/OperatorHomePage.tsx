import { useMemo } from 'react';
import type { JSX } from 'react';
import { useLocation } from 'react-router';

import { groupByRegion } from '../../core/console/regions';
import { toBogotaDateKey } from '../../core/format/time';
import { DISPLAY_LOCALE, DISPLAY_TIME_ZONE } from '../../core/policy/clientPolicy';
import { t } from '../../i18n/t';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useDecisions } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { useActiveTank } from '../../state/hooks/useTankStatus';
import { useSession } from '../../state/hooks/useSession';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { AskCard } from '../aqueduct/AssistantPanel';
import { LiveAqueduct, SceneMessage } from '../aqueduct/LiveAqueduct';
import type { LiveAqueductParts, LiveStatus } from '../aqueduct/LiveAqueduct';
import type { TankView } from '../../services/api/views';
import { PERMISSION_ASSISTANT, PERMISSION_VALVE_COMMAND } from '../aqueduct/permissions';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import { ActionQueue } from './console/ActionQueue';
import styles from './console/Console.module.css';
import { DecisionBand } from './console/DecisionBand';
import { LevelReadout } from './console/LevelReadout';
import { RegionDock } from './console/RegionDock';
import { DayShifts, ShiftNowCard, UpcomingShifts } from './ShiftCards';
import { TodayBlock, todayFacts } from './TodayCards';
import type { TodayFacts } from './TodayCards';

/** Bogotá has no daylight saving time, so its offset is fixed; noon keeps the day stable. */
const BOGOTA_NOON = 'T12:00:00-05:00';

const DAY_WORDS_FORMAT = {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
} as const;
const dayWordsFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, DAY_WORDS_FORMAT);

/**
 * Screen S07, the operation console. The decision of the moment leads: a dark band across the
 * top with the pilot's recommendation, its reason, Accept and Reject, and the pilot's mode. Under
 * it the live 3D aqueduct (the tank and one pipe per ration region) with the level over it and
 * one panel per region at its foot; at the side, the day's actions, the queue of commands and
 * decisions, and the question box. Below, the shifts, the valve list (the keyboard twin of the
 * scene) and the day's checklist. Pointing at the recommendation or a region lights its valve.
 */
export function OperatorHomePage(): JSX.Element {
  const location = useLocation();
  const session = useSession();
  const active = useActiveTank();
  const offline = useOfflineServices();
  const summary = useSyncQueue();
  const canAsk = usePermission(PERMISSION_ASSISTANT);
  const canControl = usePermission(PERMISSION_VALVE_COMMAND);
  const name = session.status === 'authenticated' ? session.user.displayName : '';
  const facts = todayFacts(summary, toBogotaDateKey(new Date(offline.clock.nowMs()).toISOString()));
  const tank = active.status === 'ready' ? active.tank : null;

  return (
    <div className={cn(styles.page)}>
      <div className={cn(styles.head)}>
        <ScreenTitle>{t('home.todayHeading', { date: dayInWords(facts.today) })}</ScreenTitle>
        <p className={cn(styles.greeting)}>{t('home.greeting', { name })}</p>
        {readDamageSent(location.state) ? <p role="status">{t('home.damageSent')}</p> : null}
      </div>
      <LiveAqueduct tankLabel={false}>
        {(parts, live) => (
          <ConsoleBody
            parts={parts}
            live={live}
            tank={tank}
            facts={facts}
            canAsk={canAsk}
            canControl={canControl}
          />
        )}
      </LiveAqueduct>
    </div>
  );
}

const noop = (): void => undefined;

interface ConsoleBodyProps {
  readonly parts: LiveAqueductParts | null;
  readonly live: LiveStatus;
  readonly tank: TankView | null;
  readonly facts: TodayFacts;
  readonly canAsk: boolean;
  readonly canControl: boolean;
}

/** The four areas of the console in reading order: band, stage, side column and what is below. */
function ConsoleBody({
  parts,
  live,
  tank,
  facts,
  canAsk,
  canControl,
}: ConsoleBodyProps): JSX.Element {
  const pending = useDecisions('PENDING', canAsk);
  const aqueduct = parts?.aqueduct ?? null;
  const regions = useMemo(
    () => (aqueduct === null ? [] : groupByRegion(aqueduct.network, aqueduct.valves)),
    [aqueduct],
  );
  const valves = aqueduct?.valves ?? [];
  const highlight = parts?.highlight ?? noop;
  const suggestion = pending.data?.[0] ?? null;

  return (
    <div className={cn(styles.console)}>
      <div className={cn(styles.bandArea)}>
        <DecisionBand valves={valves} regions={regions} onFocusValve={highlight} />
      </div>
      <section className={cn(styles.stageArea, styles.stage)} aria-label={t('console.sceneLabel')}>
        {parts === null ? (
          <div className={cn(styles.stageMessage)}>
            <SceneMessage live={live} />
          </div>
        ) : (
          <>
            <div className={cn(styles.stageScene)}>{parts.scene}</div>
            <LevelReadout aqueduct={parts.aqueduct} />
            <RegionDock
              regions={regions}
              suggestion={suggestion}
              canControl={canControl}
              onOpenValve={parts.openValve}
              onFocusValve={highlight}
            />
          </>
        )}
      </section>
      <div className={cn(styles.sideArea)}>
        <ActionQueue valves={valves} />
        {canAsk ? <AskCard compact /> : null}
      </div>
      <div className={cn(styles.belowArea)}>
        <div className={cn(styles.belowColumn)}>
          <TodayBlock tank={tank} facts={facts} part="quick" />
          <ShiftNowCard />
          <UpcomingShifts />
        </div>
        {parts === null ? null : (
          <section className={cn(styles.valvesBlock)} aria-labelledby="home-valves-title">
            <h2 id="home-valves-title" className={cn(styles.blockTitle)}>
              {t('valves.listTitle')}
            </h2>
            <p className={cn(styles.muted)}>{t('valves.listHint')}</p>
            {parts.valveList}
          </section>
        )}
        <div className={cn(styles.belowColumn)}>
          <TodayBlock tank={tank} facts={facts} part="check" />
          <TodayBlock tank={tank} facts={facts} part="tank" />
        </div>
        <div className={cn(styles.wide)}>
          <DayShifts day={facts.today} />
        </div>
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
