import { useMutation, useQuery } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type {
  DamageReportInput,
  DamageReportReceiptView,
  PublicDamageReportView,
  PublicScheduleView,
} from '../../services/api/views';
import { useCaudalApi } from '../../state/hooks/apiContext';

/**
 * Public data is keyed by the slug, not by an aqueduct id: nobody is signed in on these pages,
 * so there is no session that could leak another aqueduct's answer.
 */
export function publicScheduleKey(aqueductSlug: string): readonly string[] {
  return ['public', 'schedule', aqueductSlug];
}

/** GET /public/{slug}/schedule (S04). */
export function usePublicSchedule(aqueductSlug: string): UseQueryResult<PublicScheduleView> {
  const api = useCaudalApi();
  return useQuery({
    queryKey: publicScheduleKey(aqueductSlug),
    queryFn: () => api.public.schedule(aqueductSlug),
    refetchOnWindowFocus: false,
  });
}

/** POST /public/{slug}/damage-reports (S05). Not retried: each call is a new report. */
export function useCreateDamageReport(
  aqueductSlug: string,
): UseMutationResult<DamageReportReceiptView, Error, DamageReportInput> {
  const api = useCaudalApi();
  return useMutation({
    mutationFn: (input) => api.public.createDamageReport(aqueductSlug, input),
  });
}

/**
 * GET /public/damage-reports/{trackingCode} (S06). Keyed by the code: the code is the only thing
 * the person has, and the answer carries no personal data.
 */
export function usePublicDamageReport(
  trackingCode: string,
): UseQueryResult<PublicDamageReportView> {
  const api = useCaudalApi();
  return useQuery({
    queryKey: ['public', 'damage-report', trackingCode],
    queryFn: () => api.public.damageReportStatus(trackingCode),
    refetchOnWindowFocus: false,
  });
}
