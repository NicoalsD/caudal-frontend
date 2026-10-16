import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { queryRetryDelayMs, shouldRetryQuery } from '../../core/policy/queryRetry';
import type { CaudalApi } from '../../services/api/CaudalApi';
import { queryKeys } from '../../state/queryKeys';

/**
 * Queries retry once, never after a 4xx, and for a few minutes while the server is waking up and
 * the browser is online (core/policy/queryRetry). Mutations never retry: the offline queue does.
 * Architecture 6.1. `onError` sees every failure of any query or mutation, for app-wide errors.
 */
export function createQueryClient(
  onError?: (error: unknown) => void,
  isOnline: () => boolean = () => true,
): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: (error) => onError?.(error) }),
    mutationCache: new MutationCache({ onError: (error) => onError?.(error) }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => shouldRetryQuery(failureCount, error, isOnline()),
        retryDelay: queryRetryDelayMs,
      },
      mutations: { retry: false },
    },
  });
}

/**
 * Loads the reference data forms need at start (architecture.md 7.1). A failure is not shown
 * here: the screen that needs the data shows its own error state.
 */
export async function prefetchReferences(client: QueryClient, api: CaudalApi): Promise<void> {
  await client.prefetchQuery({
    queryKey: queryKeys.constraints,
    queryFn: () => api.meta.getConstraints(),
  });
}
