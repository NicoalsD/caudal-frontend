import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { buildConstraints } from '../factories/constraints';
import { apiUrl, originUrl } from './apiUrl';
import { errorResponse, TEST_REQUEST_ID } from './errorResponse';
import { server } from './server';

const HTTP_OK = 200;
const HTTP_TOO_MANY_REQUESTS = 429;
const NOTE_MAX = 500;
const CUSTOM_NOTE_MAX = 120;

describe('MSW test server', () => {
  it('serves the default constraints handler', async () => {
    const response = await fetch(apiUrl('/meta/constraints'));

    expect(response.status).toBe(HTTP_OK);
    const body = (await response.json()) as ReturnType<typeof buildConstraints>;
    expect(body['reading.note']?.max).toBe(NOTE_MAX);
  });

  it('serves the actuator health outside /api/v1', async () => {
    const response = await fetch(originUrl('/actuator/health'));

    expect(await response.json()).toEqual({ status: 'UP' });
  });

  it('lets a test override a handler for one case only', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        Response.json(buildConstraints({ 'reading.note': { min: 0, max: CUSTOM_NOTE_MAX } })),
      ),
    );

    const response = await fetch(apiUrl('/meta/constraints'));

    const body = (await response.json()) as ReturnType<typeof buildConstraints>;
    expect(body['reading.note']?.max).toBe(CUSTOM_NOTE_MAX);
  });

  it('restores the default handlers after each test', async () => {
    const response = await fetch(apiUrl('/meta/constraints'));

    const body = (await response.json()) as ReturnType<typeof buildConstraints>;
    expect(body['reading.note']?.max).toBe(NOTE_MAX);
  });

  it('builds the canonical error envelope with the request id header', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        errorResponse(HTTP_TOO_MANY_REQUESTS, 'RATE_LIMITED', {
          details: { retry_after: 'soon' },
          headers: { 'Retry-After': '30' },
        }),
      ),
    );

    const response = await fetch(apiUrl('/meta/constraints'));

    expect(response.status).toBe(HTTP_TOO_MANY_REQUESTS);
    expect(response.headers.get('X-Request-Id')).toBe(TEST_REQUEST_ID);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(await response.json()).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Mensaje de prueba.',
        details: { retry_after: 'soon' },
        request_id: TEST_REQUEST_ID,
      },
    });
  });

  it('rejects requests without a handler instead of reaching the network', async () => {
    const failure = await fetch(apiUrl('/ruta/sin/handler')).then(
      () => null,
      (error: unknown) => error as Error,
    );

    expect(failure).not.toBeNull();
    expect(String(failure?.cause)).toContain('onUnhandledFrame');
  });
});
