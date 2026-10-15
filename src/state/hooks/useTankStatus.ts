import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { TankStatusView, TankView } from '../../services/api/views';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useAqueductId } from './useAqueductId';
import { useTanks } from './useTanks';

/** Scope of everything that changes when a reading arrives: status and forecast of the tank. */
export const TANK_STATUS_SCOPE = 'tank-status';

/** How often an open screen asks again for the state of the tank (client policy, not a rule). */
const STATUS_REFETCH_INTERVAL_MS = 60_000;

/** GET /tanks/{id}/status, kept fresh while the screen is open. */
export function useTankStatus(tankId: string): UseQueryResult<TankStatusView> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, TANK_STATUS_SCOPE, 'status', tankId),
    queryFn: () => api.tankStatus.get(tankId),
    refetchInterval: STATUS_REFETCH_INTERVAL_MS,
  });
}

export type ActiveTankState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: unknown; readonly retry: () => void }
  | { readonly status: 'empty' }
  | { readonly status: 'ready'; readonly tank: TankView };

/**
 * The tank the screens work with: the first active one. The demo aqueduct has a single tank;
 * choosing among several is a later screen.
 */
export function useActiveTank(): ActiveTankState {
  const tanks = useTanks();
  if (tanks.isPending) {
    return { status: 'loading' };
  }
  if (tanks.isError) {
    return { status: 'error', error: tanks.error, retry: () => void tanks.refetch() };
  }
  const tank = tanks.data.find((item) => item.isActive);
  return tank === undefined ? { status: 'empty' } : { status: 'ready', tank };
}
