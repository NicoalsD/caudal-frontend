import { useMutation, useQuery } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type {
  ScheduleProposalView,
  ShiftExecutionInput,
  ShiftExecutionView,
} from '../../services/api/views';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { aqueductKey } from '../../state/queryKeys';

const DAY_SCOPE = 'closure-day';

/** Proposal statuses that hold the shifts of a day: a published day, or a day already closed. */
const SHIFT_HOLDING_STATUSES: readonly string[] = ['PUBLISHED', 'CLOSED'];

/**
 * The shifts of a service day (API.md 10.2 and 10.3). The list has every proposal of the day, so
 * the one that is published or closed is picked and read with its shifts. Null when the day has none.
 */
export function useDayProposal(serviceDate: string): UseQueryResult<ScheduleProposalView | null> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, DAY_SCOPE, serviceDate),
    queryFn: async () => {
      const summaries = await api.schedule.listForDay(serviceDate);
      const usable = summaries.find((item) => SHIFT_HOLDING_STATUSES.includes(item.status));
      return usable === undefined ? null : api.schedule.get(usable.id);
    },
    refetchOnWindowFocus: false,
  });
}

/** POST /schedule-items/{id}/execution: one shift registered (or replaced) at a time. */
export function useRecordExecution(): UseMutationResult<
  ShiftExecutionView,
  Error,
  ShiftExecutionInput
> {
  const api = useCaudalApi();
  return useMutation({
    mutationFn: (input) => api.schedule.recordExecution(input),
  });
}
