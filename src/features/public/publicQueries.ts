import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { PublicScheduleView } from '../../services/api/views';
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
