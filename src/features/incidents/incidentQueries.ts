import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseInfiniteQueryResult, UseMutationResult } from '@tanstack/react-query';

import type { IncidentTarget } from '../../core/incidents/incidentTransitions';
import type { IncidentInput, IncidentPageView, IncidentView } from '../../services/api/views';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { aqueductKey } from '../../state/queryKeys';

const INCIDENTS_SCOPE = 'incidents';

function useIncidentKey(): readonly string[] {
  return aqueductKey(useAqueductId(), INCIDENTS_SCOPE);
}

/** GET /incidents, page by page ("Ver más" asks for the next cursor). */
export function useIncidents(): UseInfiniteQueryResult<{
  readonly pages: readonly IncidentPageView[];
}> {
  const api = useCaudalApi();
  const key = useIncidentKey();
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => api.incidents.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}

export interface StatusChange {
  readonly id: string;
  readonly target: IncidentTarget;
  readonly note?: string;
}

/** PATCH /incidents/{id}/status. The list is read again, so every page shows the new status. */
export function useChangeIncidentStatus(): UseMutationResult<IncidentView, Error, StatusChange> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const key = useIncidentKey();
  return useMutation({
    mutationFn: (change) => api.incidents.changeStatus(change.id, change.target, change.note),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}

/** POST /incidents (S11). The Board's list is read again, so the new report shows there. */
export function useCreateIncident(): UseMutationResult<IncidentView, Error, IncidentInput> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const key = useIncidentKey();
  return useMutation({
    mutationFn: (input) => api.incidents.create(input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
    },
  });
}
