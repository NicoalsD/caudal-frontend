import { useInfiniteQuery } from '@tanstack/react-query';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';

import type { DevicePageView } from '../../services/api/views';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useAqueductId } from './useAqueductId';

export const DEVICES_SCOPE = 'devices';

/** GET /devices, page by page. */
export function useDevices(): UseInfiniteQueryResult<{
  readonly pages: readonly DevicePageView[];
}> {
  const api = useCaudalApi();
  const key = aqueductKey(useAqueductId(), DEVICES_SCOPE);
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => api.devices.listDevices(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}
