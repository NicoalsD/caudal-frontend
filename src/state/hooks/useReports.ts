import { useMutation, useQuery } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { ReportPeriod } from '../../services/api/endpoints/ReportsApi';
import type { NarrativeReportView, ReportView } from '../../services/api/views';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useAqueductId } from './useAqueductId';

export const REPORTS_SCOPE = 'reports';

/** The numbers do not move while someone reads them: one minute is fresh enough for a screen. */
const REPORT_STALE_MS = 60_000;

/** GET /reports for a period (REPORT_VIEW). `period` null or `enabled` false keep it off. */
export function useReport(period: ReportPeriod | null, enabled = true): UseQueryResult<ReportView> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(
      aqueductId,
      REPORTS_SCOPE,
      'numbers',
      period?.from ?? '',
      period?.to ?? '',
    ),
    queryFn: () => {
      if (period === null) {
        throw new Error('A report needs a period');
      }
      return api.reports.get(period);
    },
    enabled: enabled && period !== null,
    staleTime: REPORT_STALE_MS,
    refetchOnWindowFocus: false,
  });
}

/**
 * POST /reports/narrative. It asks the language model, so it only runs when a person presses the
 * button: never on load, never in the background.
 */
export function useNarrativeReport(): UseMutationResult<NarrativeReportView, Error, ReportPeriod> {
  const api = useCaudalApi();
  return useMutation({ mutationFn: (period: ReportPeriod) => api.reports.narrative(period) });
}
