import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { NetworkError } from '../../core/errors/NetworkError';
import { QUERY_RETRY_COUNT } from '../../core/policy/clientPolicy';
import { queryRetryDelayMs } from '../../core/policy/queryRetry';
import { queryKeys } from '../../state/queryKeys';
import { STATUS } from '../../test/constants';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { createTestApi } from '../../test/renderWithProviders';
import { createQueryClient, prefetchReferences } from './queryClient';

describe('createQueryClient', () => {
  it('retries queries with the shared policy and never retries a mutation', () => {
    const offline = createQueryClient(undefined, () => false).getDefaultOptions();
    const retry = offline.queries?.retry;

    expect(typeof retry).toBe('function');
    expect(offline.queries?.retryDelay).toBe(queryRetryDelayMs);
    expect(offline.mutations?.retry).toBe(false);
  });

  it('asks the connection when it decides, so a server waking up is retried only online', () => {
    let online = true;
    const retry = createQueryClient(undefined, () => online).getDefaultOptions().queries?.retry;
    if (typeof retry !== 'function') {
      throw new Error('expected a retry function');
    }
    const unreachable = new NetworkError();

    expect(retry(QUERY_RETRY_COUNT, unreachable)).toBe(true);
    online = false;
    expect(retry(QUERY_RETRY_COUNT, unreachable)).toBe(false);
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
