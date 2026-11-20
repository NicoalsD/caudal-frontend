import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import { Link } from 'react-router';

import { groupByRegion } from '../../core/console/regions';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { useDecisions } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { SegmentedControl } from '../../ui/primitives/SegmentedControl';
import { cn } from '../../ui/styles/cn';
import { AssistantDrawer } from '../aqueduct/AssistantDrawer';
import { LiveAqueduct } from '../aqueduct/LiveAqueduct';
import type { LiveAqueductParts } from '../aqueduct/LiveAqueduct';
import { NowCard } from '../aqueduct/NowCard';
import { PERMISSION_ASSISTANT, PERMISSION_VALVE_COMMAND } from '../aqueduct/permissions';
import { RegionList } from '../aqueduct/RegionList';
import { AnomalyList, LevelChartCard, useTankDay } from '../tank-status';
import type { ConsoleContext, PanoramaRange } from '../tank-status';
import { BoardDayGuide } from './BoardDayGuide';
import styles from './BoardPanel.module.css';

const NETWORK_PERMISSION = 'NETWORK_VIEW';
const DEFAULT_RANGE: PanoramaRange = 'week';

/**
 * The Board's panel, read top to bottom: the next step of the day, what the pilot proposes now,
 * the level of the tank with its forecast (the one chart of the screen) beside the regions, and
 * the anomalies only when there are some. The history, the network and the pilot's settings are
 * one link away instead of on this screen. The assistant waits in its side panel.
 */
export function BoardPanel({ tank, status }: ConsoleContext): JSX.Element {
  const [range, setRange] = useState<PanoramaRange>(DEFAULT_RANGE);
  const day = useTankDay(tank, status, range);
  const canSeeNetwork = usePermission(NETWORK_PERMISSION);
  const canCommandValves = usePermission(PERMISSION_VALVE_COMMAND);

  return (
    <div className={cn(styles.panel)}>
      <div className={cn(styles.top)}>
        <BoardDayGuide />
        <AssistantDrawer />
      </div>
      <LiveAqueduct readOnly={!canCommandValves}>
        {(parts) => (
          <Decisions parts={parts} canSeeNetwork={canSeeNetwork} canControl={canCommandValves}>
            <section className={cn(styles.section)} aria-labelledby="board-level-title">
              <div className={cn(styles.sectionHead)}>
                <h2 id="board-level-title" className={cn(styles.sectionTitle)}>
                  {t('board.panorama.chartTitle')}
                </h2>
                <SegmentedControl
                  label={t('board.panorama.range')}
                  value={range}
                  onChange={(next) => {
                    setRange(next as PanoramaRange);
                  }}
                  options={[
                    { value: 'today', label: t('board.panorama.today') },
                    { value: 'week', label: t('board.panorama.week') },
                    { value: 'month', label: t('board.panorama.month') },
                  ]}
                />
              </div>
              <LevelChartCard day={day} askPlumber withFacts={false} plain />
            </section>
          </Decisions>
        )}
      </LiveAqueduct>
      <AnomalyList hideWhenEmpty />
      <nav className={cn(styles.more)} aria-label={t('board.calm.moreLabel')}>
        <Link to={ROUTE_PATHS.board.autopilot}>{t('board.calm.pilotHistory')}</Link>
        <Link to={ROUTE_PATHS.board.proposals}>{t('board.calm.proposals')}</Link>
        {canSeeNetwork ? (
          <Link to={ROUTE_PATHS.board.network}>{t('board.calm.network')}</Link>
        ) : null}
      </nav>
    </div>
  );
}

const noop = (): void => undefined;

/**
 * The "now" card first, then the chart (passed as children) with the regions at its side. The
 * regions need the live aqueduct, so both live inside it. With VALVE_COMMAND_MANUAL each region
 * row gets the button that opens the valve's dialog, as on the plumber's home.
 */
function Decisions({
  parts,
  canSeeNetwork,
  canControl,
  children,
}: {
  readonly parts: LiveAqueductParts | null;
  readonly canSeeNetwork: boolean;
  readonly canControl: boolean;
  readonly children: JSX.Element;
}): JSX.Element {
  const canAsk = usePermission(PERMISSION_ASSISTANT);
  const pending = useDecisions('PENDING', canAsk);
  const aqueduct = parts?.aqueduct ?? null;
  const regions = useMemo(
    () => (aqueduct === null ? [] : groupByRegion(aqueduct.network, aqueduct.valves)),
    [aqueduct],
  );
  return (
    <>
      <NowCard valves={aqueduct?.valves ?? []} regions={regions} onFocusValve={noop} />
      <div className={cn(styles.mainGrid)}>
        {children}
        {canSeeNetwork && aqueduct !== null ? (
          <section className={cn(styles.section)} aria-labelledby="board-regions-title">
            <h2 id="board-regions-title" className={cn(styles.sectionTitle)}>
              {t('console.regionsLabel')}
            </h2>
            <RegionList
              regions={regions}
              suggestion={pending.data?.[0] ?? null}
              canControl={canControl}
              {...(canControl && parts !== null
                ? { onOpenValve: parts.openValve, onFocusValve: parts.highlight }
                : {})}
            />
          </section>
        ) : null}
      </div>
    </>
  );
}
