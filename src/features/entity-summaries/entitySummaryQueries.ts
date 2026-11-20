import { useInfiniteQuery } from '@tanstack/react-query';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';

import type { SummaryPageView } from '../../services/api/views';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { aqueductKey } from '../../state/queryKeys';

const VISIBLE_SUMMARIES_SCOPE = 'visible-summaries';

/**
 * GET /summaries for the entity: the server returns only its authorizations that are current and
 * whose membership still holds, so the screen shows whatever comes back.
 */
export function useVisibleSummaries(): UseInfiniteQueryResult<{
  readonly pages: readonly SummaryPageView[];
}> {
  const api = useCaudalApi();
  const key = aqueductKey(useAqueductId(), VISIBLE_SUMMARIES_SCOPE);
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => api.summaries.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}
