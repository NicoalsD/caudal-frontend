import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { SystemClock } from '../../core/time/SystemClock';
import { STATUS } from '../../test/constants';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { ApiError } from './errors';
import { createHttpClient } from './createHttpClient';
import type { LogFields, Logger } from './Logger';

const logged: { event: string; fields: LogFields }[] = [];
const logger: Logger = {
  info: (event, fields) => logged.push({ event, fields }),
  warn: (event, fields) => logged.push({ event, fields }),
};

const client = createHttpClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  logger,
  clock: new SystemClock(),
  random: () => 0,
});

describe('createHttpClient', () => {
  it('goes through logging and fetch for a successful call', async () => {
    logged.length = 0;

    const response = await client.request({ method: 'GET', path: '/meta/constraints' });

    expect(response.status).toBe(STATUS.ok);
    expect(logged).toHaveLength(1);
    expect(logged[0]?.fields).toMatchObject({ method: 'GET', path: '/meta/constraints' });
  });

  it('surfaces an API error as ApiError and logs it once', async () => {
    logged.length = 0;
    server.use(
      http.get(apiUrl('/meta/constraints'), () => errorResponse(STATUS.forbidden, 'FORBIDDEN')),
    );

    const failure = await client.request({ method: 'GET', path: '/meta/constraints' }).then(
      () => null,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(logged).toHaveLength(1);
    expect(logged[0]?.fields).toMatchObject({ status: STATUS.forbidden, code: 'FORBIDDEN' });
  });

  it('does not retry a POST without an idempotency key', async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl('/readings'), () => {
        calls += 1;
        return HttpResponse.error();
      }),
    );

    await client.request({ method: 'POST', path: '/readings', body: {} }).catch(() => undefined);

    expect(calls).toBe(1);
  });
});
