import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import { GLOBAL_REFERENCE_SCOPE } from '../../core/cache/ReferenceFallback';
import { REFERENCE_STALE_TIME_MS } from '../../core/policy/clientPolicy';
import { queryKeys } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useReferenceFetch } from './offlineContext';

/**
 * Field limits from GET /meta/constraints. Forms wait for this data: there is no default set of
 * limits, so while it is loading or failed the form is not armed (configuration.md section 3).
 */
export function useConstraints(): UseQueryResult<ConstraintsMap> {
  const api = useCaudalApi();
  const fetchReference = useReferenceFetch();
  return useQuery({
    queryKey: queryKeys.constraints,
    queryFn: () =>
      fetchReference(GLOBAL_REFERENCE_SCOPE, 'meta:constraints', () => api.meta.getConstraints()),
    staleTime: REFERENCE_STALE_TIME_MS,
    // Runs even without a connection, so the cached copy can answer (TanStack would pause it).
    networkMode: 'always',
    refetchOnWindowFocus: false,
  });
}
