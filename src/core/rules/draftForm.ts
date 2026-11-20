import { toInputText } from '../format/decimal';
import { ALL_DAYS_VALUE } from '../forms/FormSchemaBuilder';
import { isBandCode } from './ruleSetParts';
import type { OperatingWindow, RuleBand, SectorSetting } from './ruleSetParts';
import { assignPriorityRanks, buildSectorRows } from './sectorOrder';

/** One band as the person edits it: numbers are text so "3,5" and "3.5" both work. */
export interface BandRowValues {
  band: string;
  min_level: string;
  max_level: string;
  daily_service_hours: string;
  priority_only: boolean;
}

/** One sector row; its position in the list is its order of attention. */
export interface SectorRowValues {
  sector_id: string;
  is_included: boolean;
  is_priority: boolean;
}

/** One operating window: the day is "all" or "1" (Monday) to "7" (Sunday); times are "HH:MM". */
export interface WindowRowValues {
  day: string;
  start_time: string;
  end_time: string;
}

/** The draft form as typed. */
export interface DraftFormValues {
  bands: BandRowValues[];
  sectors: SectorRowValues[];
  windows: WindowRowValues[];
}

/** The draft form after the schema parsed it: numbers are numbers. */
export interface DraftFormOutput {
  bands: {
    band: string;
    min_level: number;
    max_level: number;
    daily_service_hours: number;
    priority_only: boolean;
  }[];
  sectors: SectorRowValues[];
  windows: { day: number | null; start_time: string; end_time: string }[];
}

export function bandsToRows(bands: readonly RuleBand[]): BandRowValues[] {
  return [...bands]
    .sort((a, b) => b.minLevel - a.minLevel)
    .map((band) => ({
      band: band.band,
      min_level: toInputText(band.minLevel),
      max_level: toInputText(band.maxLevel),
      daily_service_hours: toInputText(band.dailyServiceHours),
      priority_only: band.priorityOnly,
    }));
}

export function sectorsToRows(
  sectors: readonly SectorSetting[],
  knownSectorIds: readonly string[],
): SectorRowValues[] {
  return buildSectorRows(sectors, knownSectorIds).map((row) => ({
    sector_id: row.sectorId,
    is_included: row.isIncluded,
    is_priority: row.isPriority,
  }));
}

export function rowsToSectors(rows: readonly SectorRowValues[]): SectorSetting[] {
  return assignPriorityRanks(
    rows.map((row) => ({
      sectorId: row.sector_id,
      isIncluded: row.is_included,
      isPriority: row.is_priority,
    })),
  );
}

export function windowsToRows(windows: readonly OperatingWindow[]): WindowRowValues[] {
  return [...windows]
    .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0) || a.start.localeCompare(b.start))
    .map((window) => ({
      day: window.dayOfWeek === null ? ALL_DAYS_VALUE : String(window.dayOfWeek),
      start_time: window.start,
      end_time: window.end,
    }));
}

export function rowsToWindows(rows: DraftFormOutput['windows']): OperatingWindow[] {
  return rows.map((row) => ({ dayOfWeek: row.day, start: row.start_time, end: row.end_time }));
}

export function toDraftFormValues(
  rules: {
    readonly bands: readonly RuleBand[];
    readonly sectors: readonly SectorSetting[];
    readonly operatingWindows: readonly OperatingWindow[];
  },
  knownSectorIds: readonly string[],
): DraftFormValues {
  return {
    bands: bandsToRows(rules.bands),
    sectors: sectorsToRows(rules.sectors, knownSectorIds),
    windows: windowsToRows(rules.operatingWindows),
  };
}

/** Parsed rows back to the bands the API takes. A code that is not a band is a programming error. */
export function rowsToBands(rows: DraftFormOutput['bands']): RuleBand[] {
  return rows.map((row) => {
    if (!isBandCode(row.band)) {
      throw new Error(`Unknown band code "${row.band}"`);
    }
    return {
      band: row.band,
      minLevel: row.min_level,
      maxLevel: row.max_level,
      dailyServiceHours: row.daily_service_hours,
      priorityOnly: row.priority_only,
    };
  });
}
