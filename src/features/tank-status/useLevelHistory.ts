import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { ReadingHistoryPointView } from '../../services/api/views';
import { aqueductKey } from '../../state/queryKeys';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { TANK_STATUS_SCOPE } from '../../state/hooks/useTankStatus';

/** The widest range of the panorama ("Mes"): the chart filters this window down. */
export const LEVEL_HISTORY_DAYS = 30;
const MS_PER_DAY = 86_400_000;
const PAGE_LIMIT = 100;
const MAX_PAGES = 8;
const REFETCH_MS = 60_000;

/** GET /readings of the last 30 days, accepted readings only, following the cursor to the end. */
export function useLevelHistory(
  tankId: string,
): UseQueryResult<readonly ReadingHistoryPointView[]> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, TANK_STATUS_SCOPE, 'history', tankId, 'month'),
    queryFn: async () => {
      const to = new Date();
      const from = new Date(to.getTime() - LEVEL_HISTORY_DAYS * MS_PER_DAY);
      const points: ReadingHistoryPointView[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const result = await api.readings.history({
          tankId,
          from,
          to,
          limit: PAGE_LIMIT,
          ...(cursor === undefined ? {} : { cursor }),
        });
        points.push(...result.items);
        if (result.nextCursor === null) {
          break;
        }
        cursor = result.nextCursor;
      }
      return points;
    },
    refetchInterval: REFETCH_MS,
  });
}
