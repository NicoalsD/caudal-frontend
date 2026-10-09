import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { FakeHttpClient, okResponse } from '../../test/fakes/FakeHttpClient';
import { STATUS } from '../../test/constants';
import { originUrl } from '../../test/msw/apiUrl';
import { server } from '../../test/msw/server';
import { BaseFetchHttpClient } from '../http/BaseFetchHttpClient';
import { ApiError } from '../http/errors';
import { CaudalApi } from './CaudalApi';

describe('CaudalApi.system.health', () => {
  it('asks GET /actuator/health at the root scope', async () => {
    const fake = new FakeHttpClient(okResponse({ status: 'UP' }));

    await new CaudalApi(fake).system.health();

    expect(fake.requests).toEqual([{ method: 'GET', path: '/actuator/health', scope: 'root' }]);
  });

  it('returns a view model, not the DTO', async () => {
    const api = new CaudalApi(new FakeHttpClient(okResponse({ status: 'UP' })));

    expect(await api.system.health()).toEqual({ isUp: true });
  });

  it('reports DOWN as isUp=false', async () => {
    const api = new CaudalApi(new FakeHttpClient(okResponse({ status: 'DOWN' })));

    expect(await api.system.health()).toEqual({ isUp: false });
  });
});

describe('CaudalApi over the real transport', () => {
  const transport = new BaseFetchHttpClient({ baseUrl: import.meta.env.VITE_API_BASE_URL });

  it('reaches the actuator outside /api/v1', async () => {
    expect(await new CaudalApi(transport).system.health()).toEqual({ isUp: true });
  });

  it('lets the typed error of a failing call through', async () => {
    server.use(
      http.get(originUrl('/actuator/health'), () =>
        HttpResponse.json({ status: 'DOWN' }, { status: STATUS.serviceUnavailable }),
      ),
    );

    const failure = await new CaudalApi(transport).system.health().then(
      () => null,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(STATUS.serviceUnavailable);
  });
});
