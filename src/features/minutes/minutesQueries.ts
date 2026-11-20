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
import { saveBlob } from './saveBlob';

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

/**
 * POST /minutes/{id}/finalize (API.md 13.7). The acta is replaced with the answer (it now has its
 * PDF hash) and the list is read again.
 */
export function useFinalizeMinutes(id: string): UseMutationResult<MinutesView, Error, void> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const key = useMinutesKey();
  return useMutation({
    mutationFn: () => api.minutes.finalize(id),
    onSuccess: async (view) => {
      client.setQueryData([...key, id], view);
      await client.invalidateQueries({ queryKey: key });
    },
  });
}

export interface PdfDownloadInput {
  readonly id: string;
  readonly fileName: string;
}

/**
 * GET /minutes/{id}/pdf through the HTTP client (the token is sent), then the file is saved with
 * the given name. Nothing is cached: each download asks the server again.
 */
export function useDownloadMinutesPdf(): UseMutationResult<void, Error, PdfDownloadInput> {
  const api = useCaudalApi();
  return useMutation({
    mutationFn: async ({ id, fileName }) => {
      const pdf = await api.minutes.downloadPdf(id);
      saveBlob(pdf, fileName);
    },
  });
}
