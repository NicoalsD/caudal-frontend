import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';

import type { MinutesPageView, MinutesView } from '../../services/api/views';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { aqueductKey } from '../../state/queryKeys';

const MINUTES_SCOPE = 'minutes';

function useMinutesKey(): readonly string[] {
  return aqueductKey(useAqueductId(), MINUTES_SCOPE);
}

/** GET /minutes, page by page ("Ver más" asks for the next cursor). */
export function useMinutesList(): UseInfiniteQueryResult<{
  readonly pages: readonly MinutesPageView[];
}> {
  const api = useCaudalApi();
  const key = useMinutesKey();
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => api.minutes.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}

/** GET /minutes/{id}: the sections of one acta. */
export function useMinutes(id: string): UseQueryResult<MinutesView> {
  const api = useCaudalApi();
  const key = useMinutesKey();
  return useQuery({
    queryKey: [...key, id],
    queryFn: () => api.minutes.get(id),
    refetchOnWindowFocus: false,
  });
}

export interface PeriodInput {
  readonly periodFrom: string;
  readonly periodTo: string;
}

/** POST /minutes. The list is read again, so the new draft shows at the top. */
export function useGenerateMinutes(): UseMutationResult<MinutesView, Error, PeriodInput> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const key = useMinutesKey();
  return useMutation({
    mutationFn: (input) => api.minutes.generate(input.periodFrom, input.periodTo),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}
