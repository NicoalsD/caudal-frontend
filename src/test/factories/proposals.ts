import type { components } from '../../services/api/schema';

export type ProposalSummaryDto = components['schemas']['ScheduleProposalSummary'];

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
