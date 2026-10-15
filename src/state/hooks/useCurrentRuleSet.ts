import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { RuleSetView } from '../../services/api/views';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useAqueductId } from './useAqueductId';

export const RULE_SETS_SCOPE = 'rule-sets';

/** The active rules of the aqueduct (GET /rule-sets/current), cached per aqueduct. */
export function useCurrentRuleSet(): UseQueryResult<RuleSetView> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, RULE_SETS_SCOPE, 'current'),
    queryFn: () => api.rules.current(),
    refetchOnWindowFocus: false,
  });
}
