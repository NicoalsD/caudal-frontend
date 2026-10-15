import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { AnomalyResolution } from '../../services/api/endpoints/AnomaliesApi';
import type { AnomalyPageView, AnomalyView } from '../../services/api/views';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useAqueductId } from './useAqueductId';
import { TANK_STATUS_SCOPE } from './useTankStatus';

export const ANOMALIES_SCOPE = 'anomalies';

/** Anomalies still waiting for a review (GET /anomalies?status=OPEN). */
export function useOpenAnomalies(): UseQueryResult<AnomalyPageView> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, ANOMALIES_SCOPE, 'open'),
    queryFn: () => api.anomalies.list('OPEN'),
    refetchOnWindowFocus: false,
  });
}

export interface AnomalyResolutionChange {
  readonly id: string;
  readonly status: AnomalyResolution;
  readonly note?: string;
}

/** PATCH /anomalies/{id}. The open list and the tank status (its count) are read again. */
export function useResolveAnomaly(): UseMutationResult<
  AnomalyView,
  Error,
  AnomalyResolutionChange
> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const aqueductId = useAqueductId();
  return useMutation({
    mutationFn: (change) => api.anomalies.resolve(change.id, change.status, change.note),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: aqueductKey(aqueductId, ANOMALIES_SCOPE) }),
        client.invalidateQueries({ queryKey: aqueductKey(aqueductId, TANK_STATUS_SCOPE) }),
      ]);
    },
  });
}
