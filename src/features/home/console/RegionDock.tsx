import type { JSX } from 'react';
import {
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleHelp,
  CircleX,
  Loader,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { RegionState, RegionView } from '../../../core/console/regions';
import { formatDecimal } from '../../../core/format/decimal';
import type { LiveValve } from '../../../core/scene/sceneModel';
import { lower } from '../../../i18n/lower';
import { t } from '../../../i18n/t';
import type { AutopilotDecisionView } from '../../../services/api/views';
import { cn } from '../../../ui/styles/cn';
import styles from './Console.module.css';

const PERCENT = 100;
const WHOLE = 0;

const STATE_ICON: Readonly<Record<RegionState, LucideIcon>> = {
  OPEN: CircleCheck,
  CLOSED: CircleX,
  MIXED: CircleDot,
  UNKNOWN: CircleHelp,
  EMPTY: CircleHelp,
};

interface RegionDockProps {
  readonly regions: readonly RegionView[];
  /** The recommendation on the band: its region gets the "suggested" mark. */
  readonly suggestion: AutopilotDecisionView | null;
  readonly canControl: boolean;
  readonly onOpenValve: (valveId: string) => void;
  readonly onFocusValve: (valveId: string | null) => void;
}

/**
 * One panel per ration region, docked at the foot of the scene, in network order: the state of
 * its valves, the share of flow, a command on its way or failed, the pilot's suggestion, and the
 * button that moves each valve. Pointing at a panel lights its valve in the scene.
 */
export function RegionDock({
  regions,
  suggestion,
  canControl,
  onOpenValve,
  onFocusValve,
}: RegionDockProps): JSX.Element {
  return (
    <ul className={cn(styles.dock)} aria-label={t('console.regionsLabel')}>
      {regions.map((region) => {
        const first = region.valves[0]?.id ?? null;
        const suggested =
          suggestion !== null && region.valves.some((valve) => valve.id === suggestion.valveId)
            ? suggestion
            : null;
        return (
          <li
            key={region.id}
            className={cn(styles.region)}
            data-state={lower(region.state)}
            data-suggested={suggested !== null}
            onPointerEnter={() => {
              onFocusValve(first);
            }}
            onPointerLeave={() => {
              onFocusValve(null);
            }}
          >
            <RegionPanel
              region={region}
              suggested={suggested}
              canControl={canControl}
              onOpenValve={onOpenValve}
              onFocusValve={onFocusValve}
            />
          </li>
        );
      })}
    </ul>
  );
}

function RegionPanel({
  region,
  suggested,
  canControl,
  onOpenValve,
  onFocusValve,
}: {
  readonly region: RegionView;
  readonly suggested: AutopilotDecisionView | null;
  readonly canControl: boolean;
  readonly onOpenValve: (valveId: string) => void;
  readonly onFocusValve: (valveId: string | null) => void;
}): JSX.Element {
  const StateIcon = STATE_ICON[region.state];
  return (
    <>
      <div className={cn(styles.regionHead)}>
        <h3 className={cn(styles.regionName)}>{region.name}</h3>
        <p className={cn(styles.regionState)}>
          <StateIcon aria-hidden="true" />
          {t(`console.regionState.${lower(region.state)}`)}
        </p>
      </div>
      <p className={cn(styles.regionFlow)}>
        {region.flow > 0
          ? t('console.regionFlow', { percent: formatDecimal(region.flow * PERCENT, WHOLE) })
          : t('console.regionNoFlow')}
        {region.valves.length > 1
          ? t('console.regionValvesSuffix', { count: String(region.valves.length) })
          : null}
      </p>
      {region.commandFailed ? (
        <p className={cn(styles.regionNote, styles.noteFailed)}>
          <CircleAlert aria-hidden="true" />
          {t('console.regionFailed')}
        </p>
      ) : region.commandInFlight ? (
        <p className={cn(styles.regionNote, styles.noteInFlight)}>
          <Loader aria-hidden="true" />
          {t('console.regionInFlight')}
        </p>
      ) : null}
      {suggested === null ? null : (
        <p className={cn(styles.regionNote, styles.noteSuggested)}>
          <Sparkles aria-hidden="true" />
          {t('console.suggested', {
            action: lower(t(`assistant.action.${lower(suggested.action)}`)),
          })}
        </p>
      )}
      {canControl ? (
        <div className={cn(styles.regionActions)}>
          {region.valves.map((valve) => (
            <button
              key={valve.id}
              type="button"
              className={cn(styles.regionButton)}
              onClick={() => {
                onOpenValve(valve.id);
              }}
              onFocus={() => {
                onFocusValve(valve.id);
              }}
              onBlur={() => {
                onFocusValve(null);
              }}
            >
              {moveText(valve, region.valves.length > 1)}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** "Cerrar la llave", or "Cerrar Válvula Escuela" when the region has several. */
function moveText(valve: LiveValve, named: boolean): string {
  const action = valve.state === 'OPEN' ? t('valves.actionClose') : t('valves.actionOpen');
  return named
    ? t('console.moveNamed', { action, valve: valve.name })
    : t('console.moveValve', { action });
}
