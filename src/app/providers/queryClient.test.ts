import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '../../state/queryKeys';
import { STATUS } from '../../test/constants';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { createTestApi } from '../../test/renderWithProviders';
import { createQueryClient, prefetchReferences } from './queryClient';

describe('createQueryClient', () => {
  it('retries a query once and never retries a mutation', () => {
    const defaults = createQueryClient().getDefaultOptions();

    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.mutations?.retry).toBe(false);
  });
});

describe('prefetchReferences', () => {
  it('warms the constraints query', async () => {
    const client = createQueryClient();

    await prefetchReferences(client, createTestApi());

    expect(client.getQueryData(queryKeys.constraints)).toBeDefined();
  });

  it('does not throw when the server fails; the screen shows its own error', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        errorResponse(STATUS.badRequest, 'VALIDATION_ERROR'),
      ),
    );
    const client = createQueryClient();

    await expect(prefetchReferences(client, createTestApi())).resolves.toBeUndefined();
    expect(client.getQueryData(queryKeys.constraints)).toBeUndefined();
  });
});
