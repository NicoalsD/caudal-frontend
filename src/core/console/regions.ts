import { SectorNode } from '../network/nodes';
import type { NetworkRoot } from '../network/nodes';
import type { LiveValve } from '../scene/sceneModel';

/** What a region is doing, read from all its valves. */
export type RegionState = 'OPEN' | 'CLOSED' | 'MIXED' | 'UNKNOWN' | 'EMPTY';

/** A ration region (a root sector) with the live valves of its whole subtree. */
export interface RegionView {
  readonly id: string;
  readonly name: string;
  readonly valves: readonly LiveValve[];
  readonly state: RegionState;
  /** Mean share of the full flow of its valves, 0 to 1. */
  readonly flow: number;
  /** A command was sent and the valve has not confirmed it yet. */
  readonly commandInFlight: boolean;
  /** A command failed or expired: the region needs a look. */
  readonly commandFailed: boolean;
}

const IN_FLIGHT = new Set(['PENDING', 'DELIVERED']);
const FAILED = new Set(['FAILED', 'EXPIRED']);

/** Ids of a sector and of every sector below it. */
function subtreeIds(sector: SectorNode): readonly string[] {
  const ids = [sector.id];
  for (const child of sector.children()) {
    if (child instanceof SectorNode) {
      ids.push(...subtreeIds(child));
    }
  }
  return ids;
}

/** The state of a group of valves: any unknown wins, then all equal, then mixed. */
export function regionState(valves: readonly LiveValve[]): RegionState {
  if (valves.length === 0) {
    return 'EMPTY';
  }
  if (valves.some((valve) => valve.state === 'UNKNOWN')) {
    return 'UNKNOWN';
  }
  if (valves.every((valve) => valve.state === 'OPEN')) {
    return 'OPEN';
  }
  if (valves.every((valve) => valve.state === 'CLOSED')) {
    return 'CLOSED';
  }
  return 'MIXED';
}

/**
 * The active regions of the aqueduct in network order, each with the live valves of its whole
 * subtree. A valve whose sector hangs from no active region is left out: it has no region.
 */
export function groupByRegion(root: NetworkRoot, valves: readonly LiveValve[]): RegionView[] {
  return root
    .sectorNodes()
    .filter((sector) => sector.isActive)
    .map((sector) => {
      const ids = new Set(subtreeIds(sector));
      const own = valves.filter((valve) => ids.has(valve.sectorId));
      const flow =
        own.length === 0 ? 0 : own.reduce((sum, valve) => sum + valve.flow, 0) / own.length;
      return {
        id: sector.id,
        name: sector.name,
        valves: own,
        state: regionState(own),
        flow,
        commandInFlight: own.some(
          (valve) => valve.command !== null && IN_FLIGHT.has(valve.command.status),
        ),
        commandFailed: own.some(
          (valve) => valve.command !== null && FAILED.has(valve.command.status),
        ),
      };
    });
}

/** The region a valve belongs to, or null. */
export function regionOfValve(
  regions: readonly RegionView[],
  valveId: string | null,
): RegionView | null {
  if (valveId === null) {
    return null;
  }
  return regions.find((region) => region.valves.some((valve) => valve.id === valveId)) ?? null;
}
