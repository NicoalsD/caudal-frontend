import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseInfiniteQueryResult, UseMutationResult } from '@tanstack/react-query';

import type { CreateSummaryShareInput } from '../../services/api/endpoints/SummariesApi';
import type { SummaryPageView, SummaryShareView } from '../../services/api/views';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { aqueductKey } from '../../state/queryKeys';

const SUMMARIES_SCOPE = 'summaries';

function useSummariesKey(): readonly string[] {
  return aqueductKey(useAqueductId(), SUMMARIES_SCOPE);
}

/** GET /summaries for the Board: the current authorizations, page by page. */
export function useSummaryAuthorizations(): UseInfiniteQueryResult<{
  readonly pages: readonly SummaryPageView[];
}> {
  const api = useCaudalApi();
  const key = useSummariesKey();
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => api.summaries.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}

/** POST /summary-shares. The list is read again so the new authorization shows at once. */
export function useCreateSummaryShare(): UseMutationResult<
  SummaryShareView,
  Error,
  CreateSummaryShareInput
> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const key = useSummariesKey();
  return useMutation({
    mutationFn: (input) => api.summaries.createShare(input),
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}

/** DELETE /summary-shares/{id}. The entity stops seeing the summary once the server answers. */
export function useRevokeSummaryShare(): UseMutationResult<void, Error, string> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const key = useSummariesKey();
  return useMutation({
    mutationFn: (id) => api.summaries.revokeShare(id),
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}
