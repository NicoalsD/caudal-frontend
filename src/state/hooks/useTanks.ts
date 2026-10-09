import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { TankView } from '../../services/api/views';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useAqueductId } from './useAqueductId';
import { NETWORK_SCOPE } from './useSectors';

/** The tanks of the aqueduct (GET /tanks), cached per aqueduct. */
export function useTanks(): UseQueryResult<TankView[]> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, NETWORK_SCOPE, 'tanks'),
    queryFn: () => api.network.tanks(),
    refetchOnWindowFocus: false,
  });
}
