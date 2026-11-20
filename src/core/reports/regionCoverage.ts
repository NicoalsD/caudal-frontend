import type { ShiftsRow } from './reportModel';

/** The part of a sector the coverage needs. */
export interface SectorRef {
  readonly id: string;
  readonly name: string;
  readonly parentSectorId: string | null;
}

export interface RegionCoverage {
  readonly region: string;
  readonly plannedShifts: number;
  readonly plannedHours: number;
  readonly completedShifts: number;
  /** Completed over planned shifts, 0 to 1; null when nothing was planned. */
  readonly share: number | null;
}

/** The root sector above a sector (itself when it is a region). A broken or cyclic chain stops. */
export function regionNameOf(sector: SectorRef, all: readonly SectorRef[]): string {
  const byId = new Map(all.map((item) => [item.id, item]));
  const seen = new Set<string>();
  let current = sector;
  while (current.parentSectorId !== null && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentSectorId);
    if (parent === undefined) {
      break;
    }
    current = parent;
  }
  return current.name;
}

/**
 * Coverage of the period by region. The report groups shifts by sector name and does not give the
 * hours served, so the figure is an approximation: completed shifts over planned shifts, added up
 * under the region of each sector. A sector the list does not know counts as its own region.
 */
export function coverageByRegion(
  shifts: readonly ShiftsRow[],
  sectors: readonly SectorRef[],
): RegionCoverage[] {
  const regionOfName = new Map<string, string>();
  for (const sector of sectors) {
    regionOfName.set(sector.name, regionNameOf(sector, sectors));
  }
  const groups = new Map<
    string,
    { plannedShifts: number; plannedHours: number; completedShifts: number }
  >();
  for (const row of shifts) {
    const region = regionOfName.get(row.sector) ?? row.sector;
    const group = groups.get(region) ?? { plannedShifts: 0, plannedHours: 0, completedShifts: 0 };
    group.plannedShifts += row.planned;
    group.plannedHours += row.plannedHours;
    group.completedShifts += row.completed;
    groups.set(region, group);
  }
  return [...groups]
    .map(([region, group]) => ({
      region,
      ...group,
      share: group.plannedShifts === 0 ? null : group.completedShifts / group.plannedShifts,
    }))
    .sort((a, b) => a.region.localeCompare(b.region));
}
