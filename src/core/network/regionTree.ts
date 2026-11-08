/** The part of a sector the editor of regions needs. */
export interface RegionSector {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly parentSectorId: string | null;
  readonly isActive: boolean;
}

export interface RegionTreeNode {
  readonly sector: RegionSector;
  readonly children: readonly RegionTreeNode[];
}

/**
 * Sectors as a forest: regions (no parent, or a parent that does not exist) at the top, each with
 * the sectors under it. A cycle in the data never loops: a sector already placed is not placed again.
 */
export function buildRegionTree(sectors: readonly RegionSector[]): RegionTreeNode[] {
  const ids = new Set(sectors.map((sector) => sector.id));
  const childrenOf = new Map<string, RegionSector[]>();
  const roots: RegionSector[] = [];
  for (const sector of sectors) {
    if (sector.parentSectorId === null || !ids.has(sector.parentSectorId)) {
      roots.push(sector);
    } else {
      childrenOf.set(sector.parentSectorId, [
        ...(childrenOf.get(sector.parentSectorId) ?? []),
        sector,
      ]);
    }
  }
  const placed = new Set<string>();
  const build = (sector: RegionSector): RegionTreeNode => {
    placed.add(sector.id);
    const children = (childrenOf.get(sector.id) ?? []).filter((child) => !placed.has(child.id));
    return { sector, children: children.map(build) };
  };
  return roots.map(build);
}

/** The ids under a sector, at any depth (not the sector itself). */
export function descendantIds(sectorId: string, sectors: readonly RegionSector[]): Set<string> {
  const found = new Set<string>();
  const pending = [sectorId];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const sector of sectors) {
      if (sector.parentSectorId === current && !found.has(sector.id) && sector.id !== sectorId) {
        found.add(sector.id);
        pending.push(sector.id);
      }
    }
  }
  return found;
}

/** Where a sector can be moved: any other sector that is not under it (no cycles, API.md 5.5). */
export function parentOptions(
  sector: RegionSector,
  sectors: readonly RegionSector[],
): RegionSector[] {
  const blocked = descendantIds(sector.id, sectors);
  return sectors.filter((item) => item.id !== sector.id && !blocked.has(item.id));
}
