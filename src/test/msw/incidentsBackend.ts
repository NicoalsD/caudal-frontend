import { http, HttpResponse } from 'msw';

import { IncidentTransitions } from '../../core/incidents/incidentTransitions';
import type { IncidentTarget } from '../../core/incidents/incidentTransitions';
import type { components } from '../../services/api/schema';
import type { IncidentDto } from '../factories/incidents';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';

type UpdateDto = components['schemas']['UpdateIncidentStatusRequest'];

const PAGE_SIZE = 2;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;
const MIN_NOTE_LENGTH = 10;
const transitions = new IncidentTransitions();

/**
 * A small stateful fake of /incidents: pages of PAGE_SIZE with a cursor, and the status change
 * with the same rules as the server (409 for a move the table does not have, 422 for a dismissal
 * without a note). The list it serves is `items`, which tests can inspect.
 */
export function createIncidentsBackend(initial: readonly IncidentDto[]) {
  const items: IncidentDto[] = [...initial];
  const handlers = [
    http.get(apiUrl('/incidents'), ({ request }) => {
      const cursor = new URL(request.url).searchParams.get('cursor');
      const start = cursor === null ? 0 : Number(cursor);
      const page = items.slice(start, start + PAGE_SIZE);
      const next = start + PAGE_SIZE < items.length ? String(start + PAGE_SIZE) : null;
      return HttpResponse.json({ items: page, next_cursor: next });
    }),
    http.patch(apiUrl('/incidents/:id/status'), async ({ params, request }) => {
      const body = (await request.json()) as UpdateDto;
      const index = items.findIndex((item) => item.id === params.id);
      const current = items[index];
      if (current === undefined) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      const target: IncidentTarget = body.status;
      if (!transitions.canMove(current.status, target)) {
        return errorResponse(CONFLICT_STATUS, 'INVALID_STATE_TRANSITION');
      }
      if (target === 'DISMISSED' && (body.note ?? '').length < MIN_NOTE_LENGTH) {
        return errorResponse(UNPROCESSABLE_STATUS, 'REASON_REQUIRED');
      }
      const updated: IncidentDto = { ...current, status: target };
      items[index] = updated;
      return HttpResponse.json(updated);
    }),
  ];
  return { items, handlers };
}
