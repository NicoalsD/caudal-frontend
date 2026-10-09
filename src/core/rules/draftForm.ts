import { toInputText } from '../format/decimal';
import { isBandCode } from './ruleSetParts';
import type { RuleBand, SectorSetting } from './ruleSetParts';
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

/** The draft form as typed. */
export interface DraftFormValues {
  bands: BandRowValues[];
  sectors: SectorRowValues[];
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

export function toDraftFormValues(
  rules: { readonly bands: readonly RuleBand[]; readonly sectors: readonly SectorSetting[] },
  knownSectorIds: readonly string[],
): DraftFormValues {
  return { bands: bandsToRows(rules.bands), sectors: sectorsToRows(rules.sectors, knownSectorIds) };
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
