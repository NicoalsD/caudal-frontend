import { QueryClient } from '@tanstack/react-query';

import { QUERY_RETRY_COUNT } from '../../core/policy/clientPolicy';
import type { CaudalApi } from '../../services/api/CaudalApi';
import { queryKeys } from '../../state/queryKeys';

/** Queries retry once; mutations never (the offline queue retries them). Architecture 6.1. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: QUERY_RETRY_COUNT },
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
