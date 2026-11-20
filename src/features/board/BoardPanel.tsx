import { useState } from 'react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { usePermission } from '../../state/hooks/usePermission';
import { SegmentedControl } from '../../ui/primitives/SegmentedControl';
import { cn } from '../../ui/styles/cn';
import { LiveAqueduct } from '../aqueduct/LiveAqueduct';
import { LevelChartCard, useTankDay } from '../tank-status';
import type { ConsoleContext, PanoramaRange } from '../tank-status';
import { AssistantPromo } from './AssistantPromo';
import { BoardDayGuide } from './BoardDayGuide';
import { BoardKpis } from './BoardKpis';
import { HistoryPanel } from './HistoryPanel';
import { RecommendationStack } from './RecommendationStack';
import { SceneCard } from './SceneCard';
import { SectorsTable } from './SectorsTable';
import { useLiveCommands } from '../../state/hooks/useLiveCommands';
import { useTodayShifts } from './todayShifts';
import styles from './BoardPanel.module.css';

const NETWORK_PERMISSION = 'NETWORK_VIEW';
const DEFAULT_RANGE: PanoramaRange = 'week';

/**
 * The Board's panel, in one grid: the panorama (range, day flow, tiles), the chart with the
 * assistant and its recommendations beside it, the sectors and valves, and the 3D scene next to
 * what is pending. Each block is left out when the person lacks the permission to read it.
 */
export function BoardPanel({ tank, status }: ConsoleContext): JSX.Element {
  const [range, setRange] = useState<PanoramaRange>(DEFAULT_RANGE);
  const day = useTankDay(tank, status, range);
  const canSeeNetwork = usePermission(NETWORK_PERMISSION);
  const { items: shifts } = useTodayShifts();
  const commands = useLiveCommands(canSeeNetwork);
  const body = (
    parts: Parameters<Parameters<typeof LiveAqueduct>[0]['children']>[0],
    live: Parameters<Parameters<typeof LiveAqueduct>[0]['children']>[1],
  ): JSX.Element => {
    const valves = parts?.aqueduct.valves ?? [];
    return (
      <>
        <div className={cn(styles.side)}>
          <AssistantPromo valves={valves} />
          <RecommendationStack valves={valves} />
        </div>
        {canSeeNetwork ? (
          <SectorsTable
            valves={valves}
            commands={commands}
            shifts={shifts}
            loading={live.status === 'loading'}
          />
        ) : null}
        {canSeeNetwork ? <SceneCard parts={parts} live={live} /> : null}
      </>
    );
  };
  return (
    <div className={cn(styles.panel)}>
      <header className={cn(styles.head)}>
        <div className={cn(styles.panorama)}>
          <h2 className={cn(styles.panoramaTitle)}>{t('board.panorama.title')}</h2>
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
        <BoardDayGuide />
      </header>
      <BoardKpis tank={tank} status={status} />
      <div className={cn(styles.chart)}>
        <LevelChartCard day={day} withTimeline askPlumber />
      </div>
      <LiveAqueduct readOnly>{body}</LiveAqueduct>
      <HistoryPanel />
    </div>
  );
}
