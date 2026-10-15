import type { components } from '../../services/api/schema';
import { SECTOR_HIGH_ID, SECTOR_SCHOOL_ID } from './rules';

export type ProposalSummaryDto = components['schemas']['ScheduleProposalSummary'];
export type ProposalDto = components['schemas']['ScheduleProposal'];

export const ITEM_ID_SCHOOL = '0190f3a2-9b00-7000-8000-0000000000a1';
export const ITEM_ID_HIGH = '0190f3a2-9b00-7000-8000-0000000000a2';

export const PROPOSAL_ID_TODAY = '0190f3a2-9a00-7000-8000-000000000001';
export const PROPOSAL_ID_YESTERDAY = '0190f3a2-9a00-7000-8000-000000000002';
export const RULE_SET_ID = '0190f3a2-0000-7000-8000-0000000000c3';

/** A proposal without shifts, as GET /schedule-proposals lists it. Neutral values. */
export function buildProposalSummary(
  overrides: Partial<ProposalSummaryDto> = {},
): ProposalSummaryDto {
  return {
    id: PROPOSAL_ID_TODAY,
    service_date: '2026-10-09',
    status: 'PENDING_REVIEW',
    rule_set_id: RULE_SET_ID,
    tank_level_snapshot: 2.1,
    tank_band: 'LOW',
    available_hours: 8,
    forecast_run_id: null,
    strategy_code: 'PRIORITY_THEN_LONGEST_WAIT',
    generated_at: '2026-10-09T06:00:00-05:00',
    lock_version: 0,
    ...overrides,
  };
}

/** A full proposal: two shifts with their reasons (texts as the server writes them). */
export function buildProposal(overrides: Partial<ProposalDto> = {}): ProposalDto {
  return {
    ...buildProposalSummary(),
    items: [
      {
        id: ITEM_ID_SCHOOL,
        sector_id: SECTOR_SCHOOL_ID,
        sequence: 1,
        start_at: '2026-10-09T06:00:00-05:00',
        end_at: '2026-10-09T09:00:00-05:00',
        origin: 'PROPOSED',
        reasons: [
          {
            code: 'PRIORITY_SECTOR',
            params: { sector: 'Escuela', priority_rank: 1 },
            text: 'Escuela es prioritario y recibe turno antes que los demás.',
          },
        ],
      },
      {
        id: ITEM_ID_HIGH,
        sector_id: SECTOR_HIGH_ID,
        sequence: 2,
        start_at: '2026-10-09T09:00:00-05:00',
        end_at: '2026-10-09T17:00:00-05:00',
        origin: 'PROPOSED',
        reasons: [
          {
            code: 'HOURS_WITHOUT_SERVICE',
            params: { sector: 'Alto', horas: 38, origen: 'CONFIRMED' },
            text: 'Alto lleva 38 horas sin servicio.',
          },
        ],
      },
    ],
    unserved_sectors: [],
    decisions: [],
    snapshot_taken: false,
    ...overrides,
  };
}
