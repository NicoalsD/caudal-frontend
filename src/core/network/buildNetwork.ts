import { NetworkRoot, SectorNode, TankNode, ValveNode } from './nodes';

export interface TankInput {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly gaugeMin: number;
  readonly gaugeMax: number;
  readonly capacityLiters: number | null;
}

export interface SectorInput {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly parentSectorId: string | null;
  readonly householdsCount: number;
  readonly isActive: boolean;
}

export interface ValveInput {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly locationHint: string | null;
  readonly isMotorized: boolean;
  readonly failSafePosition: 'KEEP' | 'OPEN' | 'CLOSED';
  readonly isActive: boolean;
}

/**
 * Assembles the tree: sectors under their parent sector, valves under their sector, tanks and
 * top-level sectors under the root. A sector whose parent does not exist is shown at the top, and a
 * parent loop is cut instead of drawn forever, so bad data never freezes the screen.
 */
export function buildNetwork(
  tanks: readonly TankInput[],
  sectors: readonly SectorInput[],
  valvesBySector: ReadonlyMap<string, readonly ValveInput[]>,
): NetworkRoot {
  const nodes = new Map<string, SectorNode>();
  for (const sector of sectors) {
    const node = new SectorNode(
      sector.id,
      sector.name,
      sector.isActive,
      sector.code,
      sector.householdsCount,
    );
    for (const valve of valvesBySector.get(sector.id) ?? []) {
      node.addValve(
        new ValveNode(
          valve.id,
          valve.name,
          valve.isActive,
          valve.code,
          valve.locationHint,
          valve.isMotorized,
          valve.failSafePosition,
        ),
      );
    }
    nodes.set(sector.id, node);
  }

  const parentOf = new Map(sectors.map((sector) => [sector.id, sector.parentSectorId]));
  const reachesRoot = (id: string): boolean => {
    const seen = new Set<string>();
    let current: string | null | undefined = id;
    while (current !== null && current !== undefined) {
      if (seen.has(current)) {
        return false;
      }
      seen.add(current);
      current = parentOf.get(current) ?? null;
      if (current !== null && !nodes.has(current)) {
        return true;
      }
    }
    return true;
  };

  const top: SectorNode[] = [];
  for (const sector of sectors) {
    const node = nodes.get(sector.id);
    const parent = sector.parentSectorId === null ? undefined : nodes.get(sector.parentSectorId);
    if (node === undefined) {
      continue;
    }
    if (parent === undefined || !reachesRoot(sector.id)) {
      top.push(node);
    } else {
      parent.addSector(node);
    }
  }

  return new NetworkRoot(
    tanks.map(
      (tank) =>
        new TankNode(
          tank.id,
          tank.name,
          tank.isActive,
          tank.gaugeMin,
          tank.gaugeMax,
          tank.capacityLiters,
        ),
    ),
    top,
  );
}
