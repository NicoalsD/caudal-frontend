import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { FakeHttpClient, okResponse } from '../../test/fakes/FakeHttpClient';
import { STATUS } from '../../test/constants';
import { originUrl } from '../../test/msw/apiUrl';
import { server } from '../../test/msw/server';
import { BaseFetchHttpClient } from '../http/BaseFetchHttpClient';
import { ApiError } from '../http/errors';
import { ApiDtoAdapter } from './adapters/ApiDtoAdapter';
import { CaudalApi } from './CaudalApi';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

describe('CaudalApi.system.health', () => {
  it('asks GET /actuator/health at the root scope', async () => {
    const fake = new FakeHttpClient(okResponse({ status: 'UP' }));

    await new CaudalApi(fake, new ApiDtoAdapter(), BASE_URL).system.health();

    expect(fake.requests).toEqual([{ method: 'GET', path: '/actuator/health', scope: 'root' }]);
  });

  it('returns a view model, not the DTO', async () => {
    const api = new CaudalApi(
      new FakeHttpClient(okResponse({ status: 'UP' })),
      new ApiDtoAdapter(),
      BASE_URL,
    );

    expect(await api.system.health()).toEqual({ isUp: true });
  });

  it('reports DOWN as isUp=false', async () => {
    const api = new CaudalApi(
      new FakeHttpClient(okResponse({ status: 'DOWN' })),
      new ApiDtoAdapter(),
      BASE_URL,
    );

    expect(await api.system.health()).toEqual({ isUp: false });
  });
});

describe('CaudalApi over the real transport', () => {
  const transport = new BaseFetchHttpClient({ baseUrl: import.meta.env.VITE_API_BASE_URL });

  it('reaches the actuator outside /api/v1', async () => {
    expect(await new CaudalApi(transport, new ApiDtoAdapter(), BASE_URL).system.health()).toEqual({
      isUp: true,
    });
  });

  it('lets the typed error of a failing call through', async () => {
    server.use(
      http.get(originUrl('/actuator/health'), () =>
        HttpResponse.json({ status: 'DOWN' }, { status: STATUS.serviceUnavailable }),
      ),
    );

    const failure = await new CaudalApi(transport, new ApiDtoAdapter(), BASE_URL).system
      .health()
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(STATUS.serviceUnavailable);
  });
});
