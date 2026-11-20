import { useMemo } from 'react';
import type { JSX } from 'react';
import { Link, useLocation } from 'react-router';

import { groupByRegion } from '../../core/console/regions';
import { toBogotaDateKey } from '../../core/format/time';
import { DISPLAY_LOCALE, DISPLAY_TIME_ZONE } from '../../core/policy/clientPolicy';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useDecisions } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { useActiveTank } from '../../state/hooks/useTankStatus';
import { useSession } from '../../state/hooks/useSession';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { AssistantDrawer } from '../aqueduct/AssistantDrawer';
import { LiveAqueduct, SceneMessage } from '../aqueduct/LiveAqueduct';
import type { LiveAqueductParts, LiveStatus } from '../aqueduct/LiveAqueduct';
import { NowCard } from '../aqueduct/NowCard';
import { PERMISSION_ASSISTANT, PERMISSION_VALVE_COMMAND } from '../aqueduct/permissions';
import { RegionList } from '../aqueduct/RegionList';
import { TankSummary } from '../aqueduct/TankSummary';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import styles from './Home.module.css';
import { ShiftList } from './ShiftCards';
import { PendingNotice, TodayBlock, todayFacts } from './TodayCards';
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
 * Screen S07, the plumber's home, read top to bottom in the order of the work: the day's action
 * (a reading or the closure), what there is to decide now, the aqueduct (the 3D scene beside the
 * tank with its forecast and the regions with their valves), and today's shifts. One column of
 * sections with room between them; the assistant waits in a side panel behind one button.
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
      <ScreenTitle>{t('home.todayHeading', { date: dayInWords(facts.today) })}</ScreenTitle>
      <div className={cn(styles.intro)}>
        <p className={cn(styles.greeting)}>{t('home.greeting', { name })}</p>
        {readDamageSent(location.state) ? <p role="status">{t('home.damageSent')}</p> : null}
        <div className={cn(styles.actions)}>
          <TodayBlock tank={tank} facts={facts} part="quick" />
          <AssistantDrawer />
        </div>
        <PendingNotice facts={facts} />
      </div>
      <LiveAqueduct tankLabel={false}>
        {(parts, live) => (
          <Body parts={parts} live={live} facts={facts} canAsk={canAsk} canControl={canControl} />
        )}
      </LiveAqueduct>
    </div>
  );
}

const noop = (): void => undefined;

interface BodyProps {
  readonly parts: LiveAqueductParts | null;
  readonly live: LiveStatus;
  readonly facts: TodayFacts;
  readonly canAsk: boolean;
  readonly canControl: boolean;
}

function Body({ parts, live, facts, canAsk, canControl }: BodyProps): JSX.Element {
  const pending = useDecisions('PENDING', canAsk);
  const aqueduct = parts?.aqueduct ?? null;
  const regions = useMemo(
    () => (aqueduct === null ? [] : groupByRegion(aqueduct.network, aqueduct.valves)),
    [aqueduct],
  );
  const highlight = parts?.highlight ?? noop;

  return (
    <>
      <NowCard valves={aqueduct?.valves ?? []} regions={regions} onFocusValve={highlight} />

      <section className={cn(styles.section)} aria-labelledby="home-aqueduct-title">
        <h2 id="home-aqueduct-title" className={cn(styles.sectionTitle)}>
          {t('home.aqueductTitle')}
        </h2>
        <div className={cn(styles.aqueductGrid)}>
          <section className={cn(styles.stage)} aria-label={t('console.sceneLabel')}>
            {parts === null ? (
              <div className={cn(styles.stageMessage)}>
                <SceneMessage live={live} />
              </div>
            ) : (
              parts.scene
            )}
          </section>
          <div className={cn(styles.side)}>
            {aqueduct === null ? null : <TankSummary aqueduct={aqueduct} />}
            {parts === null ? null : (
              <div className={cn(styles.regions)}>
                <h3 className={cn(styles.subTitle)}>{t('console.regionsLabel')}</h3>
                <RegionList
                  regions={regions}
                  suggestion={pending.data?.[0] ?? null}
                  canControl={canControl}
                  onOpenValve={parts.openValve}
                  onFocusValve={highlight}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={cn(styles.section)} aria-labelledby="home-shifts-title">
        <div className={cn(styles.sectionHead)}>
          <h2 id="home-shifts-title" className={cn(styles.sectionTitle)}>
            {t('home.shiftsTitle')}
          </h2>
          <Link
            to={ROUTE_PATHS.operator.dayClosure.replace(':date', facts.today)}
            className={cn(styles.headLink)}
          >
            {t('home.dayClosure')}
          </Link>
        </div>
        <ShiftList day={facts.today} />
      </section>
    </>
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
