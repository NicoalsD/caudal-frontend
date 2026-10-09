import type { SectorSetting } from './ruleSetParts';

/** A sector as the editor lists it. The position in the list is the order of attention. */
export interface SectorRow {
  readonly sectorId: string;
  readonly isIncluded: boolean;
  readonly isPriority: boolean;
}

/**
 * The rows to edit: priority sectors first by rank (1 is served first), then the other sectors in
 * the order received. Sectors that exist in the aqueduct but have no setting in this version are
 * added at the end, included and without priority, so none is left out of the screen.
 */
export function buildSectorRows(
  settings: readonly SectorSetting[],
  knownSectorIds: readonly string[],
): SectorRow[] {
  const byRank = (a: SectorSetting, b: SectorSetting): number =>
    (a.priorityRank ?? Number.MAX_SAFE_INTEGER) - (b.priorityRank ?? Number.MAX_SAFE_INTEGER);
  const priority = settings.filter((setting) => setting.isPriority).sort(byRank);
  const rest = settings.filter((setting) => !setting.isPriority);
  const rows = [...priority, ...rest].map((setting) => ({
    sectorId: setting.sectorId,
    isIncluded: setting.isIncluded,
    isPriority: setting.isPriority,
  }));
  const present = new Set(rows.map((row) => row.sectorId));
  const missing = knownSectorIds
    .filter((id) => !present.has(id))
    .map((sectorId) => ({ sectorId, isIncluded: true, isPriority: false }));
  return [...rows, ...missing];
}

/**
 * Settings to send: the rank of each priority sector is its place among the priority sectors,
 * counting from 1, and the others have no rank. Moving a sector only changes the list order.
 */
export function assignPriorityRanks(rows: readonly SectorRow[]): SectorSetting[] {
  let rank = 0;
  return rows.map((row) => {
    if (row.isPriority) {
      rank += 1;
    }
    return {
      sectorId: row.sectorId,
      isIncluded: row.isIncluded,
      isPriority: row.isPriority,
      priorityRank: row.isPriority ? rank : null,
    };
  });
}

/** A new array with the item at `index` moved by `delta` places; out-of-range moves change nothing. */
export function moveItem<T>(items: readonly T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as T);
  return next;
}

/** Same sectors with the same flags and ranks, whatever the order of the list. */
export function sameSectorSettings(
  a: readonly SectorSetting[],
  b: readonly SectorSetting[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const key = (setting: SectorSetting): string =>
    `${setting.sectorId}|${String(setting.isIncluded)}|${String(setting.isPriority)}|${String(setting.priorityRank)}`;
  const left = a.map(key).sort();
  const right = b.map(key).sort();
  return left.every((value, index) => value === right[index]);
}
