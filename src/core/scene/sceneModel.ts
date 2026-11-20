import type { CommandStatus, ValveAction, ValveState } from '../valves/valveModel';
import { SectorNode, ValveNode } from '../network/nodes';
import type { NetworkRoot } from '../network/nodes';
import { relativeFlow } from './flow';

/** One valve of the aqueduct as the scene and the lists show it. */
export interface LiveValve {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly sectorId: string;
  readonly sectorName: string;
  readonly isMotorized: boolean;
  readonly isActive: boolean;
  readonly state: ValveState;
  /** Last command, when the valve has one. */
  readonly command: {
    readonly id: string;
    readonly action: ValveAction;
    readonly status: CommandStatus;
  } | null;
  /** Share of the full flow that passes now, 0 to 1: it falls with the square root of the level. */
  readonly flow: number;
}

/** What the live data adds to a valve of the network. */
export interface LiveValveFact {
  readonly valveId: string;
  readonly state: ValveState;
  readonly lastCommand: {
    readonly id: string;
    readonly action: ValveAction;
    readonly status: CommandStatus;
  } | null;
}

/** Valves of the network in the order a person reads it: sector by sector, valves first. */
export function collectValves(
  root: NetworkRoot,
): readonly { readonly valve: ValveNode; readonly sector: SectorNode }[] {
  const found: { valve: ValveNode; sector: SectorNode }[] = [];
  const visit = (sector: SectorNode): void => {
    for (const child of sector.children()) {
      if (child instanceof ValveNode) {
        found.push({ valve: child, sector });
      } else if (child instanceof SectorNode) {
        visit(child);
      }
    }
  };
  for (const sector of root.sectorNodes()) {
    visit(sector);
  }
  return found;
}

/**
 * Joins the network (what exists) with the live facts (what the valves are doing) and the level
 * of the tank. A valve the live list does not know is UNKNOWN and lets nothing pass: the scene
 * never draws water through a valve it cannot vouch for.
 */
export function buildLiveValves(
  root: NetworkRoot,
  live: readonly LiveValveFact[],
  tankLevelFraction: number,
): readonly LiveValve[] {
  const byValve = new Map(live.map((fact) => [fact.valveId, fact] as const));
  return collectValves(root)
    .filter(({ valve }) => valve.isActive)
    .map(({ valve, sector }) => {
      const fact = byValve.get(valve.id);
      const state = fact?.state ?? 'UNKNOWN';
      return {
        id: valve.id,
        code: valve.code,
        name: valve.name,
        sectorId: sector.id,
        sectorName: sector.name,
        isMotorized: valve.isMotorized,
        isActive: valve.isActive,
        state,
        command: fact?.lastCommand ?? null,
        flow: relativeFlow(tankLevelFraction, state === 'OPEN'),
      };
    });
}
