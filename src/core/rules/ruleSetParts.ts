/** Parts of a rule set (API.md section 6.1), in camelCase, as the editors and screens use them. */

export const BAND_CODES = ['HIGH', 'LOW', 'CRITICAL'] as const;
export type BandCode = (typeof BAND_CODES)[number];

export function isBandCode(value: unknown): value is BandCode {
  return typeof value === 'string' && (BAND_CODES as readonly string[]).includes(value);
}

/** A level band [minLevel, maxLevel): the upper band also includes the gauge maximum. */
export interface RuleBand {
  readonly band: BandCode;
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly dailyServiceHours: number;
  readonly priorityOnly: boolean;
}

export interface SectorSetting {
  readonly sectorId: string;
  readonly isIncluded: boolean;
  readonly isPriority: boolean;
  /** Position among the priority sectors (1 is served first), or null when it is not priority. */
  readonly priorityRank: number | null;
}

export interface ValveOrder {
  readonly valveId: string;
  readonly sequenceOrder: number;
}

/** Local time as "HH:MM". `dayOfWeek` is 1 (Monday) to 7 (Sunday), or null for every day. */
export interface OperatingWindow {
  readonly dayOfWeek: number | null;
  readonly start: string;
  readonly end: string;
}

/** Range of the tank gauge, from the rule set (never written in code). */
export interface Gauge {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export type RuleSetStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'DISCARDED';

/** What can be sent to PATCH /rule-sets/{id}: only the lists that changed. */
export interface RuleSetChanges {
  readonly bands?: readonly RuleBand[];
  readonly sectors?: readonly SectorSetting[];
  readonly operatingWindows?: readonly OperatingWindow[];
}
