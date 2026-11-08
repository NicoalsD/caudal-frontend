import { useState } from 'react';
import type { JSX } from 'react';
import { CircleCheck, CircleHelp, CircleX, Power } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { LiveValve } from '../../core/scene/sceneModel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { CommandOrigin } from '../../core/valves/valveModel';
import type { ScheduleItemView, ValveLiveCommandView } from '../../services/api/views';
import { Card } from '../../ui/cards/Card';
import { DataTable } from '../../ui/data/DataTable';
import { Chip, FilterChip } from '../../ui/primitives/Chip';
import type { ChipTone } from '../../ui/primitives/Chip';
import { cn } from '../../ui/styles/cn';
import { valveStateText } from '../aqueduct/valveText';
import styles from './BoardPanel.module.css';

const ALL = 'all';
const SECTION_ID = 'board-sectors-title';

const STATE_LOOK: Readonly<Record<LiveValve['state'], { icon: LucideIcon; tone: ChipTone }>> = {
  OPEN: { icon: CircleCheck, tone: 'mint' },
  CLOSED: { icon: CircleX, tone: 'coral' },
  UNKNOWN: { icon: CircleHelp, tone: 'sand' },
};

const ORIGIN_TONE: Readonly<Record<CommandOrigin, ChipTone>> = {
  MANUAL: 'sand',
  AUTOPILOT: 'lavender',
  SCHEDULE: 'aqua',
};

interface SectorsTableProps {
  readonly valves: readonly LiveValve[];
  /** The last command of each valve with its origin, by valve id. */
  readonly commands: ReadonlyMap<string, ValveLiveCommandView>;
  readonly shifts: readonly ScheduleItemView[];
  /** True while the live data of the aqueduct is still arriving. */
  readonly loading: boolean;
}

/** "Sectores y llaves": the live state of each valve, its last command and where it came from. */
export function SectorsTable({
  valves,
  commands,
  shifts,
  loading,
}: SectorsTableProps): JSX.Element {
  const [state, setState] = useState(ALL);
  const [origin, setOrigin] = useState(ALL);
  const rows = valves.filter((valve) => {
    const command = commands.get(valve.id);
    return (
      (state === ALL || valve.state === state) && (origin === ALL || command?.origin === origin)
    );
  });
  const shiftOf = (valve: LiveValve): ScheduleItemView | undefined =>
    shifts.find((item) => item.sectorId === valve.sectorId);
  return (
    <Card as="section" aria-labelledby={SECTION_ID} className={cn(styles.sectors)}>
      <header className={cn(styles.sectionHead)}>
        <h2 id={SECTION_ID} className={cn(styles.sectionTitle)}>
          {t('board.sectors.title')}
        </h2>
        <div className={cn(styles.filters)}>
          <FilterChip
            label={t('board.sectors.filterState')}
            value={state}
            onChange={setState}
            options={[
              { value: ALL, label: t('board.sectors.all') },
              { value: 'OPEN', label: t('valves.state.open') },
              { value: 'CLOSED', label: t('valves.state.closed') },
              { value: 'UNKNOWN', label: t('valves.state.unknown') },
            ]}
          />
          <FilterChip
            label={t('board.sectors.filterOrigin')}
            value={origin}
            onChange={setOrigin}
            options={[
              { value: ALL, label: t('board.sectors.allOrigins') },
              { value: 'SCHEDULE', label: t('reports.origin.schedule') },
              { value: 'MANUAL', label: t('reports.origin.manual') },
              { value: 'AUTOPILOT', label: t('reports.origin.autopilot') },
            ]}
          />
        </div>
      </header>
      <DataTable
        caption={t('board.sectors.caption')}
        rows={rows}
        loading={loading}
        getRowKey={(valve) => valve.id}
        empty={{
          title: valves.length === 0 ? t('board.sectors.emptyTitle') : t('board.sectors.none'),
          description:
            valves.length === 0
              ? t('board.sectors.emptyDescription')
              : t('ui.tableEmptyDescription'),
        }}
        columns={[
          {
            id: 'valve',
            header: t('board.sectors.valve'),
            cell: (valve) => (
              <span className={cn(styles.valveCell)}>
                <span className={cn(styles.valveIcon)} aria-hidden="true">
                  <Power />
                </span>
                <span>
                  <strong>{valve.name}</strong>
                  <span className={cn(styles.sub)}>{valve.sectorName}</span>
                </span>
              </span>
            ),
          },
          {
            id: 'state',
            header: t('board.sectors.state'),
            cell: (valve) => {
              const look = STATE_LOOK[valve.state];
              const Icon = look.icon;
              return (
                <Chip tone={look.tone} icon={<Icon aria-hidden="true" />}>
                  {valveStateText(valve)}
                </Chip>
              );
            },
          },
          {
            id: 'last',
            header: t('board.sectors.last'),
            hideOnNarrow: true,
            cell: (valve) => {
              const command = commands.get(valve.id);
              return command === undefined
                ? t('board.sectors.noCommand')
                : t('board.sectors.lastCommand', {
                    action: t(`valves.commandAction.${lower(command.action)}`),
                    when: command.createdAt.text,
                  });
            },
          },
          {
            id: 'origin',
            header: t('board.sectors.origin'),
            cell: (valve) => {
              const command = commands.get(valve.id);
              return command === undefined ? (
                '-'
              ) : (
                <Chip tone={ORIGIN_TONE[command.origin]}>
                  {t(`reports.origin.${lower(command.origin)}`)}
                </Chip>
              );
            },
          },
          {
            id: 'shift',
            header: t('board.sectors.shift'),
            hideOnNarrow: true,
            cell: (valve) => {
              const shift = shiftOf(valve);
              return shift === undefined
                ? t('board.sectors.noShift')
                : t('tankStatus.sectorShift', { start: shift.startTime, end: shift.endTime });
            },
          },
        ]}
      />
    </Card>
  );
}
