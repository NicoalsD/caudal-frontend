import type { OperatingWindow, RuleBand, SectorSetting, ValveOrder } from './ruleSetParts';
import { BAND_CODES } from './ruleSetParts';

/** The parts of a version that the history compares: bands, sector priorities, valve order, hours. */
export interface ComparableRules {
  readonly bands: readonly RuleBand[];
  readonly sectors: readonly SectorSetting[];
  readonly valveOrder: readonly ValveOrder[];
  readonly operatingWindows: readonly OperatingWindow[];
}

/** A value shown in the comparison: a number, a flag, a window, or null when the row is absent. */
export type ChangeValue = number | boolean | OperatingWindow | null;

/** One line of the comparison: what changed, in which part, and its value before and after. */
export interface RuleChange {
  readonly area: 'band' | 'sector' | 'valve' | 'window';
  /** The band code, the sector id or the valve id; empty for operating windows. */
  readonly subject: string;
  readonly field:
    | 'minLevel'
    | 'maxLevel'
    | 'dailyServiceHours'
    | 'priorityOnly'
    | 'included'
    | 'priority'
    | 'priorityRank'
    | 'sequenceOrder'
    | 'window';
  readonly before: ChangeValue;
  readonly after: ChangeValue;
}

/** Only fields that differ are listed. A part missing on one side shows as null there. */
export function diffRules(before: ComparableRules, after: ComparableRules): RuleChange[] {
  return [
    ...diffBands(before.bands, after.bands),
    ...diffSectors(before.sectors, after.sectors),
    ...diffValves(before.valveOrder, after.valveOrder),
    ...diffWindows(before.operatingWindows, after.operatingWindows),
  ];
}

function diffBands(before: readonly RuleBand[], after: readonly RuleBand[]): RuleChange[] {
  const changes: RuleChange[] = [];
  for (const code of BAND_CODES) {
    const was = before.find((band) => band.band === code);
    const now = after.find((band) => band.band === code);
    if (was === undefined && now === undefined) {
      continue;
    }
    const fields: readonly (readonly [RuleChange['field'], (band: RuleBand) => ChangeValue])[] = [
      ['minLevel', (band) => band.minLevel],
      ['maxLevel', (band) => band.maxLevel],
      ['dailyServiceHours', (band) => band.dailyServiceHours],
      ['priorityOnly', (band) => band.priorityOnly],
    ];
    for (const [field, read] of fields) {
      pushIfChanged(changes, 'band', code, field, valueOf(was, read), valueOf(now, read));
    }
  }
  return changes;
}

function diffSectors(
  before: readonly SectorSetting[],
  after: readonly SectorSetting[],
): RuleChange[] {
  const changes: RuleChange[] = [];
  for (const id of unionOf(before, after, (sector) => sector.sectorId)) {
    const was = before.find((sector) => sector.sectorId === id);
    const now = after.find((sector) => sector.sectorId === id);
    const fields: readonly (readonly [
      RuleChange['field'],
      (sector: SectorSetting) => ChangeValue,
    ])[] = [
      ['included', (sector) => sector.isIncluded],
      ['priority', (sector) => sector.isPriority],
      ['priorityRank', (sector) => sector.priorityRank],
    ];
    for (const [field, read] of fields) {
      pushIfChanged(changes, 'sector', id, field, valueOf(was, read), valueOf(now, read));
    }
  }
  return changes;
}

function diffValves(before: readonly ValveOrder[], after: readonly ValveOrder[]): RuleChange[] {
  const changes: RuleChange[] = [];
  for (const id of unionOf(before, after, (valve) => valve.valveId)) {
    const was = before.find((valve) => valve.valveId === id);
    const now = after.find((valve) => valve.valveId === id);
    pushIfChanged(
      changes,
      'valve',
      id,
      'sequenceOrder',
      valueOf(was, (valve) => valve.sequenceOrder),
      valueOf(now, (valve) => valve.sequenceOrder),
    );
  }
  return changes;
}

/** Operating windows are a set: a window present on one side only is added or removed. */
function diffWindows(
  before: readonly OperatingWindow[],
  after: readonly OperatingWindow[],
): RuleChange[] {
  const changes: RuleChange[] = [];
  for (const window of before) {
    if (!after.some((other) => sameWindow(window, other))) {
      changes.push({ area: 'window', subject: '', field: 'window', before: window, after: null });
    }
  }
  for (const window of after) {
    if (!before.some((other) => sameWindow(window, other))) {
      changes.push({ area: 'window', subject: '', field: 'window', before: null, after: window });
    }
  }
  return changes;
}

function sameWindow(a: OperatingWindow, b: OperatingWindow): boolean {
  return a.dayOfWeek === b.dayOfWeek && a.start === b.start && a.end === b.end;
}

function valueOf<Item>(item: Item | undefined, read: (item: Item) => ChangeValue): ChangeValue {
  return item === undefined ? null : read(item);
}

function pushIfChanged(
  changes: RuleChange[],
  area: RuleChange['area'],
  subject: string,
  field: RuleChange['field'],
  before: ChangeValue,
  after: ChangeValue,
): void {
  if (before !== after) {
    changes.push({ area, subject, field, before, after });
  }
}

/** The ids of both lists, in the order they first appear (the `before` list first). */
function unionOf<Item>(
  before: readonly Item[],
  after: readonly Item[],
  idOf: (item: Item) => string,
): string[] {
  const ids = new Set<string>();
  for (const item of [...before, ...after]) {
    ids.add(idOf(item));
  }
  return [...ids];
}

/** The version just before `version` (the greatest number below it), or null for the first one. */
export function previousVersion<Version extends { readonly version: number }>(
  versions: readonly Version[],
  version: number,
): Version | null {
  let previous: Version | null = null;
  for (const candidate of versions) {
    if (
      candidate.version < version &&
      (previous === null || candidate.version > previous.version)
    ) {
      previous = candidate;
    }
  }
  return previous;
}

/**
 * The pair the history compares first: the chosen version against the one before it (null when
 * it is the first one). A version that is not in the list is replaced by the latest one.
 */
export function defaultComparison<
  Version extends { readonly id: string; readonly version: number },
>(
  versions: readonly Version[],
  chosenId: string,
): { readonly before: Version | null; readonly after: Version } | null {
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const after = sorted.find((item) => item.id === chosenId) ?? sorted[0];
  if (after === undefined) {
    return null;
  }
  return { before: previousVersion(sorted, after.version), after };
}
