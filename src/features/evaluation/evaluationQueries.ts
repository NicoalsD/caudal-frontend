import { useQueries } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { ForecastEvaluationView } from '../../services/api/views';
import { aqueductKey } from '../../state/queryKeys';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { useAqueductId } from '../../state/hooks/useAqueductId';

export const EVALUATION_SCOPE = 'forecast-evaluation';

/** Calendar days (YYYY-MM-DD). An empty string means the server default (the last 90 days). */
export interface EvaluationPeriod {
  readonly from: string;
  readonly to: string;
}

/**
 * GET /forecast-evaluation for each horizon, in parallel. The period is part of the key, so a
 * new period never shows the answer of another one.
 */
export function useForecastEvaluations(
  horizons: readonly number[],
  period: EvaluationPeriod,
): UseQueryResult<ForecastEvaluationView>[] {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQueries({
    queries: horizons.map((horizonDays) => ({
      queryKey: aqueductKey(
        aqueductId,
        EVALUATION_SCOPE,
        String(horizonDays),
        period.from,
        period.to,
      ),
      queryFn: () => api.evaluation.get({ horizonDays, from: period.from, to: period.to }),
      refetchOnWindowFocus: false,
    })),
  });
}
