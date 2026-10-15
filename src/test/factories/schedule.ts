import { SECTOR_HIGH_ID, SECTOR_LOW_ID } from './rules';
import type { components } from '../../services/api/schema';

export type ScheduleItemDto = components['schemas']['ScheduleItem'];
export type ScheduleProposalDto = components['schemas']['ScheduleProposal'];
export type ShiftExecutionDto = components['schemas']['ShiftExecution'];

export const PROPOSAL_ID = '0190f3a2-8888-7000-8000-000000000001';
export const ITEM_ID_A = '0190f3a2-9999-7000-8000-000000000001';
export const ITEM_ID_B = '0190f3a2-9999-7000-8000-000000000002';
export const SECTOR_ID_ALTO = SECTOR_HIGH_ID;
export const SECTOR_ID_CENTRO = SECTOR_LOW_ID;
export const SERVICE_DAY = '2026-10-10';

/** A shift of the day in Bogota time (API.md 10.3). */
export function buildScheduleItem(overrides: Partial<ScheduleItemDto> = {}): ScheduleItemDto {
  return {
    id: ITEM_ID_A,
    sector_id: SECTOR_ID_ALTO,
    sequence: 1,
    start_at: `${SERVICE_DAY}T06:00:00-05:00`,
    end_at: `${SERVICE_DAY}T14:00:00-05:00`,
    origin: 'PROPOSED',
    reasons: [],
    ...overrides,
  };
}

/** The proposal of the day with its shifts. Neutral data. */
export function buildScheduleProposal(
  overrides: Partial<ScheduleProposalDto> = {},
): ScheduleProposalDto {
  return {
    id: PROPOSAL_ID,
    service_date: SERVICE_DAY,
    status: 'PUBLISHED',
    rule_set_id: '0190f3a2-7777-7000-8000-000000000001',
    tank_band: 'MEDIUM',
    available_hours: 16,
    strategy_code: 'PRIORITY_THEN_WAIT',
    generated_at: `${SERVICE_DAY}T05:00:00-05:00`,
    unserved_sectors: [],
    decisions: [],
    snapshot_taken: false,
    lock_version: 2,
    items: [
      buildScheduleItem(),
      buildScheduleItem({
        id: ITEM_ID_B,
        sector_id: SECTOR_ID_CENTRO,
        sequence: 2,
        start_at: `${SERVICE_DAY}T14:00:00-05:00`,
        end_at: `${SERVICE_DAY}T22:00:00-05:00`,
      }),
    ],
    ...overrides,
  };
}
