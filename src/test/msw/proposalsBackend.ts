import { http, HttpResponse } from 'msw';

import type { ProposalSummaryDto } from '../factories/proposals';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';

const CONFLICT_STATUS = 409;

/**
 * A small stateful fake of /schedule-proposals with the rules of the server: one live proposal
 * per day (409 CONFLICT otherwise) and the filters by service day. `items` can be inspected.
 */
export function createProposalsBackend(initial: readonly ProposalSummaryDto[]) {
  const items: ProposalSummaryDto[] = [...initial];
  const handlers = [
    http.get(apiUrl('/schedule-proposals'), ({ request }) => {
      const url = new URL(request.url);
      const from = url.searchParams.get('service_date_from');
      const to = url.searchParams.get('service_date_to');
      const visible = items.filter(
        (item) =>
          (from === null || item.service_date >= from) && (to === null || item.service_date <= to),
      );
      return HttpResponse.json({ items: visible, next_cursor: null });
    }),
    http.post(apiUrl('/schedule-proposals'), async ({ request }) => {
      const body = (await request.json()) as { service_date: string };
      const live = items.some(
        (item) => item.service_date === body.service_date && item.status !== 'REJECTED',
      );
      if (live) {
        return errorResponse(CONFLICT_STATUS, 'CONFLICT');
      }
      const created: ProposalSummaryDto = {
        id: crypto.randomUUID(),
        service_date: body.service_date,
        status: 'PENDING_REVIEW',
        rule_set_id: items[0]?.rule_set_id ?? crypto.randomUUID(),
        tank_level_snapshot: 2.1,
        tank_band: 'LOW',
        available_hours: 8,
        forecast_run_id: null,
        strategy_code: 'PRIORITY_THEN_LONGEST_WAIT',
        generated_at: new Date().toISOString(),
        lock_version: 0,
      };
      items.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
  ];
  return { items, handlers };
}
