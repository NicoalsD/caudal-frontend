import { useQuery } from '@tanstack/react-query';

import type { ValveLiveCommandView } from '../../services/api/views';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { LIVE_REFETCH_INTERVAL_MS, LIVE_SCOPE } from '../../state/hooks/useLiveAqueduct';
import { aqueductKey } from '../../state/queryKeys';

/**
 * The last command of each valve with its origin (manual, schedule or pilot) and its time. It
 * shares the cache of the live aqueduct: the same key and the same call, so no extra request.
 */
export function useLiveCommands(enabled: boolean): ReadonlyMap<string, ValveLiveCommandView> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  const live = useQuery({
    queryKey: aqueductKey(aqueductId, LIVE_SCOPE, 'valves'),
    queryFn: () => api.valvesLive.list(),
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
    enabled,
  });
  return new Map(
    (live.data ?? []).flatMap((fact) =>
      fact.lastCommand === null ? [] : [[fact.valveId, fact.lastCommand] as const],
    ),
  );
}
