import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { PublicInstitutionView } from '../../services/api/views';
import { queryKeys } from '../../state/queryKeys';
import { useCaudalApi } from '../../state/hooks/apiContext';

/**
 * The public directory for the first step of the sign in (GET /public/institutions). A failure is
 * shown with a retry; it never makes an unknown institution look like a valid one.
 */
export function useInstitutionDirectory(): UseQueryResult<readonly PublicInstitutionView[]> {
  const api = useCaudalApi();
  return useQuery({
    queryKey: queryKeys.institutions,
    queryFn: () => api.institutions.list(),
    refetchOnWindowFocus: false,
  });
}
