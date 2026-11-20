import { http, HttpResponse } from 'msw';
import type { HttpHandler } from 'msw';

import { readAccessTokenClaims } from '../../core/session/accessTokenClaims';
import type { components } from '../../services/api/schema';
import { STATUS } from '../constants';
import { buildDraft, buildRuleSet, DRAFT_RULE_SET_ID } from '../factories/rules';
import type { RuleBandDto, RuleSetDto } from '../factories/rules';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';
import { bearerOf } from './handlers/auth';

type UpdateDto = components['schemas']['UpdateRuleSetRequest'];
type ActivateDto = components['schemas']['ActivateRuleSetRequest'];

const REASON_MIN = 10;
const REASON_MAX = 500;
const DRAFT_ROLES = ['BOARD_ADMIN', 'BOARD_MEMBER'];
const DECIMALS = 100;

export interface RulesBackend {
  readonly handlers: HttpHandler[];
  readonly state: { active: RuleSetDto; draft: RuleSetDto | null };
  readonly calls: { patches: UpdateDto[]; activations: ActivateDto[]; creations: number };
}

const comma = (value: number): string => String(value).replace('.', ',');
const cents = (value: number): number => Math.round(value * DECIMALS);

/** Gaps and overlaps of the bands against the gauge, as the server's validation would find them. */
export function findBandProblems(
  bands: readonly RuleBandDto[],
  gauge: { min: number; max: number },
) {
  const sorted = [...bands].sort((a, b) => a.min_level - b.min_level);
  const gaps: { from: string; to: string }[] = [];
  let overlap = false;
  let cursor = gauge.min;
  for (const band of sorted) {
    if (cents(band.min_level) > cents(cursor)) {
      gaps.push({ from: comma(cursor), to: comma(band.min_level) });
    }
    if (cents(band.min_level) < cents(cursor)) {
      overlap = true;
    }
    cursor = Math.max(cursor, band.max_level);
  }
  if (cents(cursor) < cents(gauge.max)) {
    gaps.push({ from: comma(cursor), to: comma(gauge.max) });
  }
  return { gaps, overlap };
}

/**
 * A small in-memory server for the rule sets (API.md section 6 and Reglas-de-negocio.md). It keeps
 * one ACTIVE version and at most one DRAFT, checks the role from the bearer token, refuses edits
 * of a version that is not a DRAFT and validates bands and the reason on activation.
 */
export function createRulesBackend(
  initial: { active?: RuleSetDto; draft?: RuleSetDto | null } = {},
): RulesBackend {
  const state = {
    active: initial.active ?? buildRuleSet(),
    draft: initial.draft === undefined ? null : initial.draft,
  };
  const calls = { patches: [] as UpdateDto[], activations: [] as ActivateDto[], creations: 0 };

  const roleOf = (request: Request): string | null => {
    const token = bearerOf(request);
    return token === null ? null : (readAccessTokenClaims(token)?.role ?? null);
  };
  const find = (id: string): RuleSetDto | null =>
    [state.active, state.draft].find((candidate) => candidate?.id === id) ?? null;

  const handlers = [
    http.get(apiUrl('/rule-sets/current'), () => HttpResponse.json(state.active)),
    http.get(apiUrl('/rule-sets'), ({ request }) => {
      const status = new URL(request.url).searchParams.get('status');
      const items = [state.active, state.draft]
        .filter((candidate): candidate is RuleSetDto => candidate !== null)
        .filter((candidate) => status === null || candidate.status === status)
        .map((candidate) => ({
          id: candidate.id,
          version: candidate.version,
          status: candidate.status,
        }));
      return HttpResponse.json({ items, next_cursor: null });
    }),
    http.post(apiUrl('/rule-sets'), () => {
      if (state.draft !== null) {
        return errorResponse(STATUS.conflict, 'CONFLICT');
      }
      calls.creations += 1;
      state.draft = buildDraft({
        ...state.active,
        id: DRAFT_RULE_SET_ID,
        version: state.active.version + 1,
        status: 'DRAFT',
        valid_from: null,
        based_on_rule_set_id: state.active.id,
        change_reason: null,
      });
      return HttpResponse.json(state.draft, { status: STATUS.created });
    }),
    http.get(apiUrl('/rule-sets/:id'), ({ params }) => {
      const found = find(String(params.id));
      return found === null
        ? errorResponse(STATUS.notFound, 'NOT_FOUND')
        : HttpResponse.json(found);
    }),
    http.patch(apiUrl('/rule-sets/:id'), async ({ params, request }) => {
      if (!DRAFT_ROLES.includes(roleOf(request) ?? '')) {
        return errorResponse(STATUS.forbidden, 'FORBIDDEN');
      }
      const found = find(String(params.id));
      if (found === null) {
        return errorResponse(STATUS.notFound, 'NOT_FOUND');
      }
      if (found.status !== 'DRAFT') {
        return errorResponse(STATUS.conflict, 'RULE_SET_IMMUTABLE');
      }
      const changes = (await request.json()) as UpdateDto;
      calls.patches.push(changes);
      const invalidBand = changes.bands?.some((band) => band.max_level <= band.min_level) ?? false;
      if (invalidBand) {
        return errorResponse(STATUS.badRequest, 'VALIDATION_ERROR');
      }
      state.draft = { ...found, ...changes, lock_version: (found.lock_version ?? 0) + 1 };
      return HttpResponse.json(state.draft);
    }),
    http.post(apiUrl('/rule-sets/:id/activate'), async ({ params, request }) => {
      if (roleOf(request) !== 'BOARD_ADMIN') {
        return errorResponse(STATUS.forbidden, 'FORBIDDEN');
      }
      const draft = find(String(params.id));
      if (draft === null) {
        return errorResponse(STATUS.notFound, 'NOT_FOUND');
      }
      if (draft.status !== 'DRAFT') {
        return errorResponse(STATUS.conflict, 'INVALID_STATE_TRANSITION');
      }
      const body = (await request.json()) as ActivateDto;
      calls.activations.push(body);
      const reason = body.change_reason.trim();
      if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
        return errorResponse(STATUS.unprocessable, 'REASON_REQUIRED');
      }
      const problems = findBandProblems(draft.bands, draft.gauge);
      if (problems.gaps.length > 0 || problems.overlap) {
        return errorResponse(STATUS.unprocessable, 'RULE_SET_INVALID', {
          details: { gaps: problems.gaps },
        });
      }
      state.active = {
        ...draft,
        status: 'ACTIVE',
        valid_from: '2026-10-09T09:00:00-05:00',
        change_reason: reason,
      };
      state.draft = null;
      return HttpResponse.json(state.active);
    }),
  ];

  return { handlers, state, calls };
}
