import { toInputText } from '../format/decimal';
import { isBandCode } from './ruleSetParts';
import type { RuleBand } from './ruleSetParts';

/** One band as the person edits it: numbers are text so "3,5" and "3.5" both work. */
export interface BandRowValues {
  band: string;
  min_level: string;
  max_level: string;
  daily_service_hours: string;
  priority_only: boolean;
}

/** The draft form as typed. */
export interface DraftFormValues {
  bands: BandRowValues[];
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

export function toDraftFormValues(bands: readonly RuleBand[]): DraftFormValues {
  return { bands: bandsToRows(bands) };
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
