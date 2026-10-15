import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';

import type {
  ScheduleProposalPageView,
  ScheduleProposalSummaryView,
} from '../../services/api/views';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { aqueductKey } from '../../state/queryKeys';

/** Every proposal query lives under this scope, so one invalidation refreshes all of them. */
export const PROPOSALS_SCOPE = 'schedule-proposals';

function useProposalKey(...parts: readonly string[]): readonly string[] {
  return aqueductKey(useAqueductId(), PROPOSALS_SCOPE, ...parts);
}

/** GET /schedule-proposals, page by page (the Board's list, S13). */
export function useProposalList(): UseInfiniteQueryResult<{
  readonly pages: readonly ScheduleProposalPageView[];
}> {
  const api = useCaudalApi();
  const key = useProposalKey('list');
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) =>
      api.proposals.list(pageParam === undefined ? {} : { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}

/** The proposals of one service day (today's, for the day guide and the list header). */
export function useProposalsOfDay(
  day: string,
): UseQueryResult<readonly ScheduleProposalSummaryView[]> {
  const api = useCaudalApi();
  const key = useProposalKey('day', day);
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const page = await api.proposals.list({ serviceDateFrom: day, serviceDateTo: day });
      return page.items;
    },
    refetchOnWindowFocus: false,
  });
}

/** POST /schedule-proposals for a day. Every proposal query is read again afterwards. */
export function useGenerateProposal(): UseMutationResult<
  ScheduleProposalSummaryView,
  Error,
  string
> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const key = useProposalKey();
  return useMutation({
    mutationFn: (serviceDate: string) => api.proposals.generate(serviceDate),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}
