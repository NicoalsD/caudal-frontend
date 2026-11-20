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

import type { RegionState, RegionView } from '../../core/console/regions';
import { formatDecimal } from '../../core/format/decimal';
import type { LiveValve } from '../../core/scene/sceneModel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { AutopilotDecisionView } from '../../services/api/views';
import { cn } from '../../ui/styles/cn';
import styles from './RegionList.module.css';

const noop = (): void => undefined;
const PERCENT = 100;
const WHOLE = 0;

const STATE_ICON: Readonly<Record<RegionState, LucideIcon>> = {
  OPEN: CircleCheck,
  CLOSED: CircleX,
  MIXED: CircleDot,
  UNKNOWN: CircleHelp,
  EMPTY: CircleHelp,
};

interface RegionListProps {
  readonly regions: readonly RegionView[];
  /** The recommendation on the band: its region gets the "suggested" mark. */
  readonly suggestion: AutopilotDecisionView | null;
  readonly canControl: boolean;
  /** Opens the valve's dialog. Without it (a look-only screen) the rows have no buttons. */
  readonly onOpenValve?: (valveId: string) => void;
  readonly onFocusValve?: (valveId: string | null) => void;
}

/**
 * The ration regions as a short list, one row each in network order: the name, the state of its
 * valves in a word with its icon, the share of flow, a command on its way or failed, the pilot's
 * suggestion, and the button that moves each valve. Pointing at a row lights its valve in the
 * scene. Without control (the Board) the rows only tell.
 */
export function RegionList({
  regions,
  suggestion,
  canControl,
  onOpenValve,
  onFocusValve = noop,
}: RegionListProps): JSX.Element {
  return (
    <ul className={cn(styles.list)} aria-label={t('console.regionsLabel')}>
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
              onOpenValve={onOpenValve ?? null}
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
  readonly onOpenValve: ((valveId: string) => void) | null;
  readonly onFocusValve: (valveId: string | null) => void;
}): JSX.Element {
  const StateIcon = STATE_ICON[region.state];
  return (
    <>
      <div className={cn(styles.regionText)}>
        <h3 className={cn(styles.regionName)}>{region.name}</h3>
        <p className={cn(styles.regionState)}>
          <StateIcon aria-hidden="true" />
          {t(`console.regionState.${lower(region.state)}`)}
          <span className={cn(styles.regionFlow)}>
            {' · '}
            {region.flow > 0
              ? t('console.regionFlow', { percent: formatDecimal(region.flow * PERCENT, WHOLE) })
              : t('console.regionNoFlow')}
            {region.valves.length > 1
              ? t('console.regionValvesSuffix', { count: String(region.valves.length) })
              : null}
          </span>
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
      </div>
      {onOpenValve === null ? null : (
        <div className={cn(styles.regionActions)}>
          {region.valves.map((valve) => (
            <button
              key={valve.id}
              type="button"
              className={cn(styles.regionButton)}
              aria-label={fullText(valve, canControl)}
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
              {shortText(valve, canControl, region.valves.length > 1)}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/** What the button does, in short: "Cerrar la llave", "Cerrar Válvula Escuela" or "Ver la llave". */
function shortText(valve: LiveValve, canControl: boolean, named: boolean): string {
  if (!canControl) {
    return named ? t('valves.lookNamed', { valve: valve.name }) : t('console.lookValve');
  }
  const action = valve.state === 'OPEN' ? t('valves.actionClose') : t('valves.actionOpen');
  return named
    ? t('console.moveNamed', { action, valve: valve.name })
    : t('console.moveValve', { action });
}

/** The full name for screen readers: it always says which valve. */
function fullText(valve: LiveValve, canControl: boolean): string {
  if (!canControl) {
    return t('valves.lookNamed', { valve: valve.name });
  }
  return valve.state === 'OPEN'
    ? t('valves.closeNamed', { valve: valve.name })
    : t('valves.openNamed', { valve: valve.name });
}
