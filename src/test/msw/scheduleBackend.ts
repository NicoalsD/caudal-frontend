import { http, HttpResponse } from 'msw';

import type { components } from '../../services/api/schema';
import { buildProposalSummary } from '../factories/schedule';
import type { ScheduleProposalDto, ShiftExecutionDto } from '../factories/schedule';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';

type ExecutionRequest = components['schemas']['ShiftExecutionRequest'];

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const CREATED_STATUS = 201;
const ID_DIGITS = 12;

/**
 * A small fake of the proposal and execution endpoints (API.md 10.2, 10.3, 11.1). The day holds
 * the proposal given; each execution is stored in `executions`, and a second one for the same
 * shift must replace the first (`supersedes_id`), as the server does. `closedDays` makes the day
 * answer like a closed one (the proposal is CLOSED, no new executions).
 */
export function createScheduleBackend(proposal: ScheduleProposalDto) {
  const executions: ShiftExecutionDto[] = [];
  const state = { proposal, closed: false };
  const handlers = [
    http.get(apiUrl('/schedule-proposals'), () =>
      HttpResponse.json({
        items: [buildProposalSummary({ id: state.proposal.id, status: state.proposal.status })],
        next_cursor: null,
      }),
    ),
    http.get(apiUrl('/schedule-proposals/:id'), ({ params }) => {
      if (params.id !== state.proposal.id) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      return HttpResponse.json(state.proposal);
    }),
    http.post(apiUrl('/schedule-items/:id/execution'), async ({ params, request }) => {
      const body = (await request.json()) as ExecutionRequest;
      const itemId = String(params.id);
      if (state.closed) {
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
  ];
  return { executions, state, handlers };
}
