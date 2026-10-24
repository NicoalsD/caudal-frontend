/** A turn of the published schedule, as far as the choice of sector needs to know. */
export interface SectorTurn {
  readonly sectorName: string;
}

/**
 * The sector the person chose on this phone, if it still appears in the published schedule. The
 * stored value is only the sector name: a stale or unknown name gives null, so the screen asks
 * for a sector again instead of showing a turn that does not exist.
 */
export function resolveChosenSector(
  turns: readonly SectorTurn[],
  stored: string | null,
): string | null {
  if (stored === null) {
    return null;
  }
  return turns.some((turn) => turn.sectorName === stored) ? stored : null;
}

/** The turns of one sector, in the order the schedule gives them. */
export function turnsForSector<T extends SectorTurn>(turns: readonly T[], sectorName: string): T[] {
  return turns.filter((turn) => turn.sectorName === sectorName);
}
