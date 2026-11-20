import { http, HttpResponse } from 'msw';

import type { components } from '../../services/api/schema';
import type { ScheduleProposalDto, ShiftExecutionDto } from '../factories/schedule';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';

type ExecutionRequest = components['schemas']['ShiftExecutionRequest'];
type ClosureRequest = components['schemas']['DayClosureRequest'];
type DayClosureDto = components['schemas']['DayClosure'];

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const CREATED_STATUS = 201;
const ID_DIGITS = 12;
const CLOSED_PROPOSAL_STATUS = 'CLOSED';
const PUBLISHED_PROPOSAL_STATUS = 'PUBLISHED';
const PUBLISHED_AT = '2026-10-09T18:00:00-05:00';
const SHIFT_HOLDING_STATUSES: readonly string[] = ['PUBLISHED', 'CLOSED'];

/**
 * A small fake of the published schedule, execution and closure endpoints (API.md 11, and
 * GET /days/{date}/schedule). Each execution is
 * stored in `executions`; a second one for the same shift must replace the first (`supersedes_id`),
 * as the server does. Closing the day moves the proposal to CLOSED and then refuses executions and
 * a second closure (409), as the server does.
 */
export function createScheduleBackend(proposal: ScheduleProposalDto) {
  const executions: ShiftExecutionDto[] = [];
  const closureRequests: ClosureRequest[] = [];
  const state: { proposal: ScheduleProposalDto; closure: DayClosureDto | null } = {
    proposal,
    closure: null,
  };
  const handlers = [
    // The operator reads the published schedule of the day (SCHEDULE_VIEW), not the proposals.
    http.get(apiUrl('/days/:date/schedule'), () => {
      if (!SHIFT_HOLDING_STATUSES.includes(state.proposal.status)) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      return HttpResponse.json({
        service_date: state.proposal.service_date,
        proposal_id: state.proposal.id,
        published_at: PUBLISHED_AT,
        items: state.proposal.items,
      });
    }),
    http.post(apiUrl('/schedule-items/:id/execution'), async ({ params, request }) => {
      const body = (await request.json()) as ExecutionRequest;
      const itemId = String(params.id);
      if (state.closure !== null) {
        return errorResponse(CONFLICT_STATUS, 'INVALID_STATE_TRANSITION');
      }
      const previous = executions.find((item) => item.schedule_item_id === itemId);
      if (previous !== undefined && body.supersedes_id !== previous.id) {
        return errorResponse(CONFLICT_STATUS, 'CONFLICT');
      }
      const created: ShiftExecutionDto = {
        id: `0190f3a2-aaaa-7000-8000-${String(executions.length + 1).padStart(ID_DIGITS, '0')}`,
        schedule_item_id: itemId,
        status: body.status,
        actual_start: body.actual_start ?? null,
        actual_end: body.actual_end ?? null,
        note: body.note ?? null,
        supersedes_id: body.supersedes_id ?? null,
      };
      executions.push(created);
      return HttpResponse.json(created, { status: CREATED_STATUS });
    }),
    http.get(apiUrl('/days/:date/closure'), () => {
      if (state.closure === null) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      return HttpResponse.json({ ...state.closure, executions });
    }),
    http.post(apiUrl('/days/:date/closure'), async ({ request }) => {
      const body = (await request.json()) as ClosureRequest;
      closureRequests.push(body);
      if (state.closure !== null) {
        return errorResponse(CONFLICT_STATUS, 'CONFLICT');
      }
      if (state.proposal.status !== PUBLISHED_PROPOSAL_STATUS) {
        return errorResponse(CONFLICT_STATUS, 'INVALID_STATE_TRANSITION');
      }
      state.proposal = { ...state.proposal, status: CLOSED_PROPOSAL_STATUS };
      state.closure = {
        id: '0190f3a2-bbbb-7000-8000-000000000001',
        service_date: state.proposal.service_date,
        notes: body.notes,
        closed_by: '0190f3a2-cccc-7000-8000-000000000001',
        closed_at: '2026-10-10T20:00:00-05:00',
        executions: [],
      };
      return HttpResponse.json({ ...state.closure, executions }, { status: CREATED_STATUS });
    }),
  ];
  return { executions, closureRequests, state, handlers };
}
