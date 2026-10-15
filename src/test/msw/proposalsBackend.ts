import { http, HttpResponse } from 'msw';

import { buildProposalSummary } from '../factories/proposals';
import type { components } from '../../services/api/schema';
import type { ProposalDto, ProposalSummaryDto } from '../factories/proposals';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';

const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;
const MIN_REASON = 10;
const MAX_REASON = 500;
const ONE = 1;
const BOARD_USER_ID = '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a81';

type DecideBody = components['schemas']['DecideScheduleProposalRequest'];
type RejectBody = components['schemas']['RejectScheduleProposalRequest'];
type ModifyBody = components['schemas']['ModifyScheduleProposalRequest'];

const INVALID_TRANSITION = { error: 'INVALID_STATE_TRANSITION' } as const;

interface Transition {
  readonly status: ProposalDto['status'];
  readonly decision: 'APPROVED' | 'APPROVED_WITH_CHANGES' | 'REJECTED';
  readonly reason: string | null;
  readonly items?: ProposalDto['items'];
}

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

  /** One decision: checks the version and the state, then records it in the history. */
  function decide(
    id: string,
    lockVersion: number,
    next: (current: ProposalDto) => Transition | typeof INVALID_TRANSITION,
  ): Response {
    const index = items.findIndex((item) => item.id === id);
    const current = items[index];
    if (current === undefined) {
      return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
    }
    if (current.lock_version !== lockVersion) {
      return errorResponse(CONFLICT_STATUS, 'CONFLICT');
    }
    const result = next(current);
    if ('error' in result) {
      return errorResponse(CONFLICT_STATUS, 'INVALID_STATE_TRANSITION');
    }
    const updated: ProposalDto = {
      ...current,
      status: result.status,
      lock_version: current.lock_version + ONE,
      items: result.items ?? current.items,
      decisions: [
        ...current.decisions,
        {
          decision: result.decision,
          reason: result.reason,
          decided_by: BOARD_USER_ID,
          decided_at: new Date().toISOString(),
        },
      ],
    };
    items[index] = updated;
    return HttpResponse.json(updated);
  }
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
    http.post(apiUrl('/schedule-proposals/:id/approve'), async ({ params, request }) => {
      const body = (await request.json()) as DecideBody;
      return decide(String(params.id), body.lock_version, (current) =>
        current.status === 'PENDING_REVIEW'
          ? { status: 'APPROVED', decision: 'APPROVED', reason: null }
          : INVALID_TRANSITION,
      );
    }),
    http.post(apiUrl('/schedule-proposals/:id/modify'), async ({ params, request }) => {
      const body = (await request.json()) as ModifyBody;
      if (body.reason.trim().length < MIN_REASON || body.reason.length > MAX_REASON) {
        return errorResponse(UNPROCESSABLE_STATUS, 'REASON_REQUIRED');
      }
      return decide(String(params.id), body.lock_version, (current) =>
        current.status === 'PENDING_REVIEW'
          ? {
              status: 'APPROVED_WITH_CHANGES',
              decision: 'APPROVED_WITH_CHANGES',
              reason: body.reason,
              items: body.items.map((item) => ({
                id: item.id ?? crypto.randomUUID(),
                sector_id: item.sector_id,
                sequence: item.sequence,
                start_at: item.start_at,
                end_at: item.end_at,
                origin: item.id === null ? 'ADDED' : 'MODIFIED',
                reasons: [],
              })),
            }
          : INVALID_TRANSITION,
      );
    }),
    http.post(apiUrl('/schedule-proposals/:id/reject'), async ({ params, request }) => {
      const body = (await request.json()) as RejectBody;
      if (body.reason.trim().length < MIN_REASON || body.reason.length > MAX_REASON) {
        return errorResponse(UNPROCESSABLE_STATUS, 'REASON_REQUIRED');
      }
      return decide(String(params.id), body.lock_version, (current) =>
        current.status === 'PENDING_REVIEW'
          ? { status: 'REJECTED', decision: 'REJECTED', reason: body.reason }
          : INVALID_TRANSITION,
      );
    }),
    http.post(apiUrl('/schedule-proposals/:id/publish'), async ({ params, request }) => {
      const body = (await request.json()) as DecideBody;
      const current = items.find((item) => item.id === params.id);
      if (current === undefined) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      if (current.lock_version !== body.lock_version) {
        return errorResponse(CONFLICT_STATUS, 'CONFLICT');
      }
      if (current.status !== 'APPROVED' && current.status !== 'APPROVED_WITH_CHANGES') {
        return errorResponse(CONFLICT_STATUS, 'INVALID_STATE_TRANSITION');
      }
      current.status = 'PUBLISHED';
      current.lock_version += ONE;
      return HttpResponse.json(
        {
          id: crypto.randomUUID(),
          proposal_id: current.id,
          published_at: new Date().toISOString(),
          whatsapp_text: 'Horario publicado.',
          poster_sha256: null,
        },
        { status: 201 },
      );
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
