import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { buildConstraints } from '../../../test/factories/constraints';
import { STATUS } from '../../../test/constants';
import { FakeHttpClient, okResponse } from '../../../test/fakes/FakeHttpClient';
import { apiUrl } from '../../../test/msw/apiUrl';
import { errorResponse } from '../../../test/msw/errorResponse';
import { server } from '../../../test/msw/server';
import { BaseFetchHttpClient } from '../../http/BaseFetchHttpClient';
import { ApiError } from '../../http/errors';
import { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { MetaApi } from './MetaApi';

const NOTE_MAX = 500;
const NOTE_LINES = 10;

describe('MetaApi.getConstraints', () => {
  it('asks GET /meta/constraints with no body', async () => {
    const fake = new FakeHttpClient(okResponse(buildConstraints()));

    await new MetaApi(fake, new ApiDtoAdapter()).getConstraints();

    expect(fake.requests).toEqual([{ method: 'GET', path: '/meta/constraints' }]);
  });

  it('returns camelCase limits per field, not the DTO', async () => {
    const api = new MetaApi(
      new BaseFetchHttpClient({ baseUrl: import.meta.env.VITE_API_BASE_URL }),
      new ApiDtoAdapter(),
    );

    const constraints = await api.getConstraints();

    expect(constraints['reading.note']).toEqual({ min: 0, max: NOTE_MAX, maxLines: NOTE_LINES });
    expect(constraints['sector.code']?.pattern).toBe('^[A-Z0-9-]+$');
  });

  it('fails with the typed API error when the server rejects the call', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        errorResponse(STATUS.tooManyRequests, 'RATE_LIMITED'),
      ),
    );
    const api = new MetaApi(
      new BaseFetchHttpClient({ baseUrl: import.meta.env.VITE_API_BASE_URL }),
      new ApiDtoAdapter(),
    );

    await expect(api.getConstraints()).rejects.toBeInstanceOf(ApiError);
  });
});
