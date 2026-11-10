import { useState } from 'react';
import type { JSX } from 'react';
import { useLocation } from 'react-router';
import { Box, CalendarClock, ChevronUp, Waves } from 'lucide-react';

import { toBogotaDateKey } from '../../core/format/time';
import { DISPLAY_LOCALE, DISPLAY_TIME_ZONE } from '../../core/policy/clientPolicy';
import { t } from '../../i18n/t';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useActiveTank } from '../../state/hooks/useTankStatus';
import { useSession } from '../../state/hooks/useSession';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { AssistantPanel } from '../aqueduct/AssistantPanel';
import { AutopilotModeControl } from '../aqueduct/AutopilotModeControl';
import { LiveAqueduct, SceneMessage } from '../aqueduct/LiveAqueduct';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { SegmentedControl } from '../../ui/primitives/SegmentedControl';
import { cn } from '../../ui/styles/cn';
import styles from './OperatorHome.module.css';
import { SceneHero } from './SceneHero';
import { DayShifts, ShiftNowCard, UpcomingShifts } from './ShiftCards';
import { TodayBlock, todayFacts } from './TodayCards';

const ICON_SIZE = 20;
const PANEL_BODY_ID = 'operator-panel-body';
/** Bogotá has no daylight saving time, so its offset is fixed; noon keeps the day stable. */
const BOGOTA_NOON = 'T12:00:00-05:00';

const DAY_WORDS_FORMAT = {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
} as const;
const dayWordsFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, DAY_WORDS_FORMAT);

/** The views of a phone: the scene with its sheet, the valves alone, or the shifts alone. */
type HomeView = 'scene' | 'valves' | 'shifts';

/**
 * Screen S07, the plumber's home. On a desktop: the live 3D scene in a big card with a wavy top
 * edge at the left, and a column at the right with the shift now, the day's actions, the
 * assistant's recommendations as a fan of cards, the autopilot mode, the question box, the valves
 * as cards and the day's checklist. On a phone: the scene on top and the column as a bottom
 * sheet; the control at the top swaps the scene for the valves or the shifts.
 * Every state has an icon and a text, never the color alone. The phone's queue and the actions
 * show even when the tank does not load: the plumber must see what is pending.
 */
export function OperatorHomePage(): JSX.Element {
  const location = useLocation();
  const session = useSession();
  const active = useActiveTank();
  const offline = useOfflineServices();
  const summary = useSyncQueue();
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<HomeView>('scene');
  const name = session.status === 'authenticated' ? session.user.displayName : '';
  const facts = todayFacts(summary, toBogotaDateKey(new Date(offline.clock.nowMs()).toISOString()));
  const tank = active.status === 'ready' ? active.tank : null;

  return (
    <div className={cn(styles.page)}>
      <div className={cn(styles.head)}>
        <ScreenTitle>{t('home.todayHeading', { date: dayInWords(facts.today) })}</ScreenTitle>
        <p className={cn(styles.greeting)}>{t('home.greeting', { name })}</p>
        {readDamageSent(location.state) ? <p role="status">{t('home.damageSent')}</p> : null}
        <SegmentedControl
          className={cn(styles.viewSwitch)}
          label={t('home.viewLabel')}
          value={view}
          onChange={(next) => {
            setView(next as HomeView);
          }}
          options={[
            { value: 'scene', label: t('home.viewScene'), icon: <Box aria-hidden="true" /> },
            { value: 'valves', label: t('home.viewValves'), icon: <Waves aria-hidden="true" /> },
            {
              value: 'shifts',
              label: t('home.viewShifts'),
              icon: <CalendarClock aria-hidden="true" />,
            },
          ]}
        />
      </div>
      <LiveAqueduct>
        {(parts, live) => (
          <div className={cn(styles.layout)} data-view={view}>
            <div className={cn(styles.heroSlot)}>
              <SceneHero aqueduct={parts?.aqueduct ?? null} label={t('operatorHome.sceneRegion')}>
                {parts === null ? (
                  <div className={cn(styles.sceneMessage)}>
                    <SceneMessage live={live} />
                  </div>
                ) : (
                  parts.scene
                )}
              </SceneHero>
            </div>
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
                <div className={cn(styles.areaTop)}>
                  <div className={cn(styles.group)} data-group="shifts">
                    <ShiftNowCard />
                  </div>
                  <div className={cn(styles.group)} data-group="scene">
                    <TodayBlock tank={tank} facts={facts} part="quick" />
                    <AssistantPanel valves={parts?.aqueduct.valves ?? []} />
                  </div>
                  <div className={cn(styles.group)} data-group="shifts">
                    <UpcomingShifts />
                  </div>
                </div>
                <div className={cn(styles.areaBottom)}>
                  {parts === null ? null : (
                    <section
                      className={cn(styles.group, styles.block, styles.wide)}
                      data-group="valves"
                      aria-labelledby="home-valves-title"
                    >
                      <h2 id="home-valves-title" className={cn(styles.sectionTitle)}>
                        {t('valves.listTitle')}
                      </h2>
                      <p className={cn(styles.muted)}>{t('valves.listHint')}</p>
                      {parts.valveList}
                    </section>
                  )}
                  <div className={cn(styles.group)} data-group="scene">
                    <AutopilotModeControl />
                  </div>
                  <div className={cn(styles.group)} data-group="scene">
                    <TodayBlock tank={tank} facts={facts} part="tank" />
                  </div>
                  <div className={cn(styles.group)} data-group="scene">
                    <TodayBlock tank={tank} facts={facts} part="check" />
                  </div>
                  <div className={cn(styles.group, styles.wide)} data-group="shifts">
                    <DayShifts day={facts.today} />
                  </div>
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
