import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { SectorView } from '../../services/api/views';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useAqueductId } from './useAqueductId';

export const NETWORK_SCOPE = 'network';

/** The sectors of the aqueduct (GET /sectors), cached per aqueduct. */
export function useSectors(): UseQueryResult<SectorView[]> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, NETWORK_SCOPE, 'sectors'),
    queryFn: () => api.network.sectors(),
    refetchOnWindowFocus: false,
  });
}
