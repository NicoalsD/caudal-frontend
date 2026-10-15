import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';

import type {
  ScheduleProposalPageView,
  ScheduleProposalSummaryView,
  ScheduleProposalView,
  SchedulePublicationView,
} from '../../services/api/views';
import type { ModifiedShift } from '../../core/proposal/ProposalEditorMediator';
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

/** GET /schedule-proposals/{id}: the full proposal (S13 detail). */
export function useProposal(id: string, enabled = true): UseQueryResult<ScheduleProposalView> {
  const api = useCaudalApi();
  const key = useProposalKey('detail', id);
  return useQuery({
    queryKey: key,
    queryFn: () => api.proposals.get(id),
    enabled: enabled && id !== '',
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

export interface ApproveInput {
  readonly id: string;
  readonly lockVersion: number;
}

export interface ModifyInput extends ApproveInput {
  readonly reason: string;
  readonly items: readonly ModifiedShift[];
}

export interface RejectInput extends ApproveInput {
  readonly reason: string;
}

/** Each decision reads every proposal query again, so the list, the detail and the day agree. */
function useAfterDecision(): () => Promise<void> {
  const client = useQueryClient();
  const key = useProposalKey();
  return async () => {
    await client.invalidateQueries({ queryKey: key });
  };
}

/** POST /schedule-proposals/{id}/approve. */
export function useApproveProposal(): UseMutationResult<ScheduleProposalView, Error, ApproveInput> {
  const api = useCaudalApi();
  const refresh = useAfterDecision();
  return useMutation({
    mutationFn: (input) => api.proposals.approve(input.id, input.lockVersion),
    onSuccess: refresh,
  });
}

/** POST /schedule-proposals/{id}/modify with the shifts that remain and the reason. */
export function useModifyProposal(): UseMutationResult<ScheduleProposalView, Error, ModifyInput> {
  const api = useCaudalApi();
  const refresh = useAfterDecision();
  return useMutation({
    mutationFn: (input) =>
      api.proposals.modify(input.id, input.lockVersion, input.reason, input.items),
    onSuccess: refresh,
  });
}

/** POST /schedule-proposals/{id}/reject, a final state. */
export function useRejectProposal(): UseMutationResult<ScheduleProposalView, Error, RejectInput> {
  const api = useCaudalApi();
  const refresh = useAfterDecision();
  return useMutation({
    mutationFn: (input) => api.proposals.reject(input.id, input.lockVersion, input.reason),
    onSuccess: refresh,
  });
}

export interface PublishInput {
  readonly id: string;
  readonly lockVersion: number;
}

/** POST /schedule-proposals/{id}/publish: the approved schedule becomes visible to the families. */
export function usePublishProposal(): UseMutationResult<
  SchedulePublicationView,
  Error,
  PublishInput
> {
  const api = useCaudalApi();
  const refresh = useAfterDecision();
  return useMutation({
    mutationFn: (input) => api.proposals.publish(input.id, input.lockVersion),
    onSuccess: refresh,
  });
}
