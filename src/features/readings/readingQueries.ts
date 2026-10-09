import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useRef } from 'react';

import { REFERENCE_STALE_TIME_MS } from '../../core/policy/clientPolicy';
import type { CatalogItemView, ReadingInput, ReadingResultView } from '../../services/api/views';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { aqueductKey } from '../../state/queryKeys';

/** Scope shared with the tank status queries, so a saved reading refreshes them. */
export const TANK_STATUS_SCOPE = 'tank-status';

/** GET /catalogs/WATER_APPEARANCE: the options for how the water looks. Changes rarely. */
export function useWaterAppearances(): UseQueryResult<CatalogItemView[]> {
  const api = useCaudalApi();
  return useQuery({
    queryKey: ['catalogs', 'WATER_APPEARANCE'],
    queryFn: () => api.meta.catalog('WATER_APPEARANCE'),
    staleTime: REFERENCE_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

/** What identifies one reading across retries: the same id and the same observation moment. */
interface Attempt {
  readonly id: string;
  readonly observedAt: Date;
}

export type ReadingDraft = Omit<ReadingInput, 'id' | 'observedAt'>;

export interface SubmitReading {
  readonly mutation: UseMutationResult<ReadingResultView, Error, ReadingDraft>;
  /** Forgets the pending attempt so the next reading gets a new id (after a saved one). */
  readonly reset: () => void;
}

/**
 * POST /readings with a client UUID. A failed send keeps its id and observation time, so sending
 * it again is the same reading to the server (idempotency, API.md 1.6) and never a duplicate.
 */
export function useSubmitReading(): SubmitReading {
  const api = useCaudalApi();
  const client = useQueryClient();
  const aqueductId = useAqueductId();
  const attempt = useRef<Attempt | null>(null);

  const mutation = useMutation({
    mutationFn: (draft: ReadingDraft) => {
      attempt.current ??= { id: crypto.randomUUID(), observedAt: new Date() };
      return api.readings.submit({ ...draft, ...attempt.current });
    },
    onSuccess: async () => {
      attempt.current = null;
      await client.invalidateQueries({ queryKey: aqueductKey(aqueductId, TANK_STATUS_SCOPE) });
    },
  });
  return {
    mutation,
    reset: () => {
      attempt.current = null;
      mutation.reset();
    },
  };
}
