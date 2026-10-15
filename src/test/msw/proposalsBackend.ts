import { http, HttpResponse } from 'msw';

import { buildProposalSummary } from '../factories/proposals';
import type { ProposalDto, ProposalSummaryDto } from '../factories/proposals';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';

const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;

/** The list fields of a proposal (API.md 10.2): no shifts, no history. */
function summaryOf(proposal: ProposalDto): ProposalSummaryDto {
  return buildProposalSummary({
    id: proposal.id,
    service_date: proposal.service_date,
    status: proposal.status,
    rule_set_id: proposal.rule_set_id,
    tank_level_snapshot: proposal.tank_level_snapshot ?? null,
    tank_band: proposal.tank_band ?? null,
    available_hours: proposal.available_hours,
    forecast_run_id: proposal.forecast_run_id ?? null,
    strategy_code: proposal.strategy_code,
    generated_at: proposal.generated_at,
    lock_version: proposal.lock_version,
  });
}

/**
 * A small stateful fake of /schedule-proposals with the rules of the server: one live proposal
 * per day (409 CONFLICT otherwise) and the filters by service day. `items` can be inspected.
 */
export function createProposalsBackend(initial: readonly ProposalDto[]) {
  const items: ProposalDto[] = [...initial];
  const handlers = [
    http.get(apiUrl('/schedule-proposals'), ({ request }) => {
      const url = new URL(request.url);
      const from = url.searchParams.get('service_date_from');
      const to = url.searchParams.get('service_date_to');
      const visible = items
        .map(summaryOf)
        .filter(
          (item) =>
            (from === null || item.service_date >= from) &&
            (to === null || item.service_date <= to),
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
      const created: ProposalDto = {
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
        items: [],
        unserved_sectors: [],
        decisions: [],
        snapshot_taken: false,
      };
      items.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
    http.get(apiUrl('/schedule-proposals/:id'), ({ params }) => {
      const found = items.find((item) => item.id === params.id);
      return found === undefined
        ? errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND')
        : HttpResponse.json(found);
    }),
  ];
  return { items, handlers };
}
