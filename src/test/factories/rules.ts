import type { components } from '../../services/api/schema';

export type RuleSetDto = components['schemas']['RuleSet'];
export type RuleBandDto = components['schemas']['RuleBand'];
export type RuleSectorSettingDto = components['schemas']['RuleSectorSetting'];
export type RuleOperatingWindowDto = components['schemas']['RuleOperatingWindow'];

export const ACTIVE_RULE_SET_ID = '0190f3a2-0000-7000-8000-0000000000c3';
export const DRAFT_RULE_SET_ID = '0190f3a2-0000-7000-8000-0000000000c4';
export const SECTOR_SCHOOL_ID = '0190f3a2-0000-7000-8000-0000000000d1';
export const SECTOR_HIGH_ID = '0190f3a2-0000-7000-8000-0000000000d2';
export const SECTOR_LOW_ID = '0190f3a2-0000-7000-8000-0000000000d3';

/** The seed of Reglas-de-negocio.md section 2.1 (tank from 0 to 5). */
export const SEED_BANDS: RuleBandDto[] = [
  { band: 'HIGH', min_level: 3.5, max_level: 5, daily_service_hours: 16, priority_only: false },
  { band: 'LOW', min_level: 1.5, max_level: 3.5, daily_service_hours: 8, priority_only: false },
  { band: 'CRITICAL', min_level: 0, max_level: 1.5, daily_service_hours: 3, priority_only: true },
];

export const SEED_SECTORS: RuleSectorSettingDto[] = [
  { sector_id: SECTOR_SCHOOL_ID, is_included: true, is_priority: true, priority_rank: 1 },
  { sector_id: SECTOR_HIGH_ID, is_included: true, is_priority: false, priority_rank: null },
  { sector_id: SECTOR_LOW_ID, is_included: true, is_priority: false, priority_rank: null },
];

export const SEED_WINDOWS: RuleOperatingWindowDto[] = [
  { day_of_week: null, start_time: '05:00', end_time: '21:00' },
];

/** An ACTIVE version. Pass overrides to get a DRAFT or other values. */
export function buildRuleSet(overrides: Partial<RuleSetDto> = {}): RuleSetDto {
  return {
    id: ACTIVE_RULE_SET_ID,
    version: 3,
    status: 'ACTIVE',
    valid_from: '2026-10-01T08:00:00-05:00',
    valid_to: null,
    based_on_rule_set_id: null,
    change_reason: 'Versión inicial de prueba.',
    lock_version: 1,
    reserve_level: 1,
    reserve_policy: 'REDUCE_TO_CRITICAL_BAND',
    max_daily_service_hours: 16,
    min_shift_hours: 1,
    max_shift_hours: 8,
    allocation_strategy: 'PRIORITY_THEN_LONGEST_WAIT',
    duplicate_window_minutes: 5,
    max_level_change_per_hour: 0.5,
    stale_reading_hours: 12,
    max_backdate_days: 2,
    forecast_horizon_days: 3,
    forecast_context_days: 14,
    trend_threshold_per_day: 0.1,
    bands: SEED_BANDS.map((band) => ({ ...band })),
    sectors: SEED_SECTORS.map((sector) => ({ ...sector })),
    valve_order: [],
    operating_windows: SEED_WINDOWS.map((window) => ({ ...window })),
    gauge: { min: 0, max: 5, step: 0.01 },
    server_time: '2026-10-09T04:30:00-05:00',
    ...overrides,
  };
}

/** The draft that POST /rule-sets would create from the seed. */
export function buildDraft(overrides: Partial<RuleSetDto> = {}): RuleSetDto {
  return buildRuleSet({
    id: DRAFT_RULE_SET_ID,
    version: 4,
    status: 'DRAFT',
    valid_from: null,
    based_on_rule_set_id: ACTIVE_RULE_SET_ID,
    change_reason: null,
    ...overrides,
  });
}
