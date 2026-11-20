import { HttpResponse } from 'msw';

import type { components } from '../../services/api/schema';

type ErrorBody = components['schemas']['ErrorBody'];

export const TEST_REQUEST_ID = '7f3c2a9e-1d4b-4e1a-9c0e-2b8f5a6d1e33';

interface ErrorOptions {
  readonly message?: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly requestId?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Canonical error envelope of API.md section 1.3, with the X-Request-Id header. */
export function errorResponse(status: number, code: string, options: ErrorOptions = {}): Response {
  const requestId = options.requestId ?? TEST_REQUEST_ID;
  const error: ErrorBody = {
    code,
    message: options.message ?? 'Mensaje de prueba.',
    request_id: requestId,
    ...(options.details === undefined ? {} : { details: { ...options.details } }),
  };
  return HttpResponse.json(
    { error },
    { status, headers: { 'X-Request-Id': requestId, ...options.headers } },
  );
}
