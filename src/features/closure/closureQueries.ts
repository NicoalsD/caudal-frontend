import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type {
  DayClosureView,
  PublishedScheduleView,
  ShiftExecutionInput,
  ShiftExecutionView,
} from '../../services/api/views';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { aqueductKey } from '../../state/queryKeys';

const DAY_SCOPE = 'closure-day';
const CLOSURE_SCOPE = 'closure';

/**
 * The published shifts of a service day (GET /days/{date}/schedule). Null when the day has no
 * published schedule (its 404). The operator cannot read the proposal, so this is the source.
 */
export function useDaySchedule(serviceDate: string): UseQueryResult<PublishedScheduleView | null> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, DAY_SCOPE, serviceDate),
    queryFn: () => api.schedule.getPublished(serviceDate),
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

/** GET /days/{date}/closure: null while the day is open (its 404). */
export function useDayClosure(serviceDate: string): UseQueryResult<DayClosureView | null> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, CLOSURE_SCOPE, serviceDate),
    queryFn: () => api.closure.get(serviceDate),
    refetchOnWindowFocus: false,
  });
}

/**
 * POST /days/{date}/closure. A closed day is shown from the answer; the day's shifts are read
 * again, since the proposal moves to CLOSED.
 */
export function useCloseDay(serviceDate: string): UseMutationResult<DayClosureView, Error, string> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const aqueductId = useAqueductId();
  return useMutation({
    mutationFn: (notes: string) => api.closure.close(serviceDate, notes),
    onSuccess: async (closure) => {
      client.setQueryData(aqueductKey(aqueductId, CLOSURE_SCOPE, serviceDate), closure);
      await client.invalidateQueries({ queryKey: aqueductKey(aqueductId, DAY_SCOPE, serviceDate) });
    },
  });
}
