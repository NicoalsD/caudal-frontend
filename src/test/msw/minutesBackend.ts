import { http, HttpResponse } from 'msw';

import type { components } from '../../services/api/schema';
import { buildMinutes, summaryOf } from '../factories/minutes';
import type { MinutesDto } from '../factories/minutes';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';

type MinutesRequest = components['schemas']['MinutesRequest'];

const PAGE_SIZE = 2;
const NOT_FOUND_STATUS = 404;
const BAD_REQUEST_STATUS = 400;
const CREATED_STATUS = 201;
const MS_PER_DAY = 86_400_000;
const MAX_PERIOD_DAYS = 366;
const ID_DIGITS = 12;
const CONFLICT_STATUS = 409;
const FINALIZED_AT = '2026-10-08T15:00:00Z';
/** A neutral 64-character hex value, the shape of a SHA-256. */
const SHA256_LENGTH = 64;
export const PDF_SHA256 = 'a'.repeat(SHA256_LENGTH);

/**
 * A small stateful fake of /minutes: the list is paged (PAGE_SIZE, cursor = offset), the detail
 * answers with the four sections, and a generation adds a draft at the top. `actas` is what the
 * tests can inspect. The server refuses a period longer than 366 days (API.md 13.1).
 */
export function createMinutesBackend(initial: readonly MinutesDto[]) {
  const actas: MinutesDto[] = [...initial];
  const handlers = [
    http.get(apiUrl('/minutes'), ({ request }) => {
      const cursor = new URL(request.url).searchParams.get('cursor');
      const start = cursor === null ? 0 : Number(cursor);
      const page = actas.slice(start, start + PAGE_SIZE).map((acta) => summaryOf(acta));
      const next = start + PAGE_SIZE < actas.length ? String(start + PAGE_SIZE) : null;
      return HttpResponse.json({ items: page, next_cursor: next });
    }),
    http.get(apiUrl('/minutes/:id'), ({ params }) => {
      const acta = actas.find((item) => item.id === params.id);
      return acta === undefined
        ? errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND')
        : HttpResponse.json(acta);
    }),
    http.post(apiUrl('/minutes'), async ({ request }) => {
      const body = (await request.json()) as MinutesRequest;
      const days = (Date.parse(body.period_to) - Date.parse(body.period_from)) / MS_PER_DAY;
      if (days < 0 || days > MAX_PERIOD_DAYS) {
        return errorResponse(BAD_REQUEST_STATUS, 'VALIDATION_ERROR');
      }
      const created = buildMinutes({
        id: `0190f3a2-dddd-7000-8000-${String(actas.length + 1).padStart(ID_DIGITS, '0')}`,
        period_from: body.period_from,
        period_to: body.period_to,
      });
      actas.unshift(created);
      return HttpResponse.json(created, { status: CREATED_STATUS });
    }),
    http.post(apiUrl('/minutes/:id/finalize'), ({ params }) => {
      const index = actas.findIndex((item) => item.id === params.id);
      const current = actas[index];
      if (current === undefined) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      if (current.status !== 'DRAFT') {
        return errorResponse(CONFLICT_STATUS, 'INVALID_STATE_TRANSITION');
      }
      const final: MinutesDto = {
        ...current,
        status: 'FINAL',
        finalized_at: FINALIZED_AT,
        pdf_sha256: PDF_SHA256,
      };
      actas[index] = final;
      return HttpResponse.json(final);
    }),
  ];
  return { actas, handlers };
}
