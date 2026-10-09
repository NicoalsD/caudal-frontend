import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { NetworkError } from '../../core/errors/NetworkError';
import { STATUS } from '../../test/constants';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse, TEST_REQUEST_ID } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { BaseFetchHttpClient } from './BaseFetchHttpClient';
import { ApiError } from './errors';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const client = new BaseFetchHttpClient({ baseUrl: BASE_URL });

const RETRY_AFTER_SECONDS = 30;
const PAGE_SIZE = 20;
const GAUGE = 2.1;

function recordingFetch(): {
  readonly calls: { readonly url: string; readonly init: RequestInit }[];
  readonly fetchFn: typeof fetch;
} {
  const calls: { readonly url: string; readonly init: RequestInit }[] = [];
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ url: input instanceof Request ? input.url : input.toString(), init: init ?? {} });
    return Promise.resolve(Response.json({}));
  };
  return { calls, fetchFn };
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error: unknown) => error,
  );
}

describe('BaseFetchHttpClient success', () => {
  it('returns the JSON body, the status and the request id', async () => {
    server.use(
      http.get(apiUrl('/things'), () =>
        HttpResponse.json({ name: 'tanque' }, { headers: { 'X-Request-Id': TEST_REQUEST_ID } }),
      ),
    );

    const response = await client.request<{ name: string }>({ method: 'GET', path: '/things' });

    expect(response).toEqual({
      status: STATUS.ok,
      body: { name: 'tanque' },
      requestId: TEST_REQUEST_ID,
    });
  });

  it('sends the mandatory headers and no credentials outside /auth/', async () => {
    const fake = recordingFetch();
    const withFake = new BaseFetchHttpClient({ baseUrl: BASE_URL, fetchFn: fake.fetchFn });

    await withFake.request({ method: 'GET', path: '/things' });

    const headers = new Headers(fake.calls[0]?.init.headers);
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('X-Requested-With')).toBe('caudal-web');
    expect(fake.calls[0]?.init.credentials).toBe('omit');
  });

  it('includes credentials only for /auth/ paths', async () => {
    const fake = recordingFetch();
    const withFake = new BaseFetchHttpClient({ baseUrl: BASE_URL, fetchFn: fake.fetchFn });

    await withFake.request({ method: 'POST', path: '/auth/refresh' });

    expect(fake.calls[0]?.init.credentials).toBe('include');
  });

  it('serializes the query and sends a JSON body with its content type', async () => {
    let url: URL | undefined;
    let contentType: string | null = null;
    let received: unknown;
    server.use(
      http.post(apiUrl('/readings'), async ({ request }) => {
        url = new URL(request.url);
        contentType = request.headers.get('Content-Type');
        received = await request.json();
        return HttpResponse.json({ id: 'x' }, { status: STATUS.created });
      }),
    );

    const response = await client.request({
      method: 'POST',
      path: '/readings',
      query: { limit: PAGE_SIZE, cursor: 'a b' },
      body: { gauge_value: GAUGE },
    });

    expect(response.status).toBe(STATUS.created);
    expect(url?.searchParams.get('limit')).toBe(String(PAGE_SIZE));
    expect(url?.searchParams.get('cursor')).toBe('a b');
    expect(contentType).toBe('application/json');
    expect(received).toEqual({ gauge_value: GAUGE });
  });

  it('returns an undefined body for 204', async () => {
    server.use(
      http.delete(apiUrl('/things/1'), () => new HttpResponse(null, { status: STATUS.noContent })),
    );

    const response = await client.request({ method: 'DELETE', path: '/things/1' });

    expect(response.status).toBe(STATUS.noContent);
    expect(response.body).toBeUndefined();
  });

  it('tolerates a trailing slash in the base URL', async () => {
    const withSlash = new BaseFetchHttpClient({ baseUrl: `${BASE_URL}/` });

    const response = await withSlash.request({ method: 'GET', path: '/meta/constraints' });

    expect(response.status).toBe(STATUS.ok);
  });

  it('refuses a path that does not start with a slash', async () => {
    await expect(client.request({ method: 'GET', path: 'things' })).rejects.toThrow('must start');
  });
});

describe('BaseFetchHttpClient errors', () => {
  it('turns the canonical envelope into a typed ApiError', async () => {
    server.use(
      http.post(apiUrl('/readings'), () =>
        errorResponse(STATUS.unprocessable, 'GAUGE_OUT_OF_RANGE', {
          message: 'Fuera de rango.',
          details: { gauge_min: '0,00', gauge_max: '5,00' },
        }),
      ),
    );

    const error = await failureOf(client.request({ method: 'POST', path: '/readings', body: {} }));

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(STATUS.unprocessable);
    expect(apiError.code).toBe('GAUGE_OUT_OF_RANGE');
    expect(apiError.message).toBe('Fuera de rango.');
    expect(apiError.details).toEqual({ gauge_min: '0,00', gauge_max: '5,00' });
    expect(apiError.requestId).toBe(TEST_REQUEST_ID);
  });

  it('prefers the X-Request-Id header and falls back to the body request id', async () => {
    server.use(
      http.get(apiUrl('/a'), () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'x', request_id: 'from-body' } },
          { status: STATUS.notFound },
        ),
      ),
    );

    const error = (await failureOf(client.request({ method: 'GET', path: '/a' }))) as ApiError;

    expect(error.requestId).toBe('from-body');
    expect(error.details).toEqual({});
  });

  it('reads Retry-After on rate limiting', async () => {
    server.use(
      http.post(apiUrl('/auth/login'), () =>
        errorResponse(STATUS.tooManyRequests, 'RATE_LIMITED', {
          headers: { 'Retry-After': String(RETRY_AFTER_SECONDS) },
        }),
      ),
    );

    const error = (await failureOf(
      client.request({ method: 'POST', path: '/auth/login', body: {} }),
    )) as ApiError;

    expect(error.code).toBe('RATE_LIMITED');
    expect(error.retryAfterSeconds).toBe(RETRY_AFTER_SECONDS);
  });

  it('maps a non-canonical 5xx body to INTERNAL_ERROR without leaking its text', async () => {
    server.use(
      http.get(apiUrl('/a'), () =>
        HttpResponse.text('<html>stack trace</html>', { status: STATUS.badGateway }),
      ),
    );

    const error = (await failureOf(client.request({ method: 'GET', path: '/a' }))) as ApiError;

    expect(error.status).toBe(STATUS.badGateway);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).not.toContain('stack trace');
  });

  it('maps a non-canonical 4xx body to UNEXPECTED_RESPONSE', async () => {
    server.use(
      http.get(apiUrl('/a'), () =>
        HttpResponse.json({ hello: 'world' }, { status: STATUS.badRequest }),
      ),
    );

    const error = (await failureOf(client.request({ method: 'GET', path: '/a' }))) as ApiError;

    expect(error.code).toBe('UNEXPECTED_RESPONSE');
  });

  it('fails with UNEXPECTED_RESPONSE when a success body is not JSON', async () => {
    server.use(http.get(apiUrl('/a'), () => HttpResponse.text('not json')));

    const error = (await failureOf(client.request({ method: 'GET', path: '/a' }))) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('UNEXPECTED_RESPONSE');
  });

  it('turns a connection failure into NetworkError keeping the cause', async () => {
    server.use(http.get(apiUrl('/a'), () => HttpResponse.error()));

    const error = await failureOf(client.request({ method: 'GET', path: '/a' }));

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).cause).toBeDefined();
  });

  it('lets an aborted request through as an AbortError, not as a network failure', async () => {
    server.use(http.get(apiUrl('/a'), () => HttpResponse.json({})));
    const controller = new AbortController();
    controller.abort();

    const error = await failureOf(
      client.request({ method: 'GET', path: '/a', signal: controller.signal }),
    );

    expect(error).not.toBeInstanceOf(NetworkError);
    expect((error as Error).name).toBe('AbortError');
  });
});
