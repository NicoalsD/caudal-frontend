import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { HealthView } from '../../services/api/views';
import { useCaudalApi } from '../../state/hooks/apiContext';

/** GET /actuator/health (API.md 19.1): outside /api/v1, read on every visit and on "Actualizar". */
export function useSystemHealth(): UseQueryResult<HealthView> {
  const api = useCaudalApi();
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => api.system.health(),
    refetchOnWindowFocus: false,
  });
}
