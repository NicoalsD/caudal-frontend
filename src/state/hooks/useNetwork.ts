import { useQueries, useQuery } from '@tanstack/react-query';

import { buildNetwork } from '../../core/network/buildNetwork';
import type { NetworkRoot } from '../../core/network/nodes';
import { useCaudalApi } from './apiContext';
import { NETWORK_SCOPE, useSectors } from './useSectors';
import { useAqueductId } from './useAqueductId';
import { aqueductKey } from '../queryKeys';

export interface FailedSector {
  readonly sectorId: string;
  readonly name: string;
}

export type NetworkState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: unknown; readonly retry: () => void }
  | {
      readonly status: 'ready';
      readonly root: NetworkRoot;
      /** Sectors whose valves could not be loaded: they are drawn without valves. */
      readonly failedSectors: readonly FailedSector[];
      readonly retryValves: () => void;
    };

/**
 * The network as a tree: GET /tanks, GET /sectors and GET /sectors/{id}/valves for each sector,
 * assembled by buildNetwork (Composite). One failing valve list does not hide the rest.
 */
export function useNetwork(): NetworkState {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  const sectors = useSectors();
  const tanks = useQuery({
    queryKey: aqueductKey(aqueductId, NETWORK_SCOPE, 'tanks'),
    queryFn: () => api.network.tanks(),
    refetchOnWindowFocus: false,
  });
  const valves = useQueries({
    queries: (sectors.data ?? []).map((sector) => ({
      queryKey: aqueductKey(aqueductId, NETWORK_SCOPE, 'valves', sector.id),
      queryFn: () => api.network.valves(sector.id),
      refetchOnWindowFocus: false,
    })),
  });

  if (sectors.isError) {
    return { status: 'error', error: sectors.error, retry: () => void sectors.refetch() };
  }
  if (tanks.isError) {
    return { status: 'error', error: tanks.error, retry: () => void tanks.refetch() };
  }
  if (sectors.isPending || tanks.isPending || valves.some((query) => query.isPending)) {
    return { status: 'loading' };
  }

  const bySector = new Map(
    sectors.data.map((sector, index) => [sector.id, valves[index]?.data ?? []] as const),
  );
  const failedSectors = sectors.data.flatMap((sector, index) =>
    valves[index]?.isError === true ? [{ sectorId: sector.id, name: sector.name }] : [],
  );
  return {
    status: 'ready',
    root: buildNetwork(tanks.data, sectors.data, bySector),
    failedSectors,
    retryValves: () => {
      valves.forEach((query) => {
        if (query.isError) {
          void query.refetch();
        }
      });
    },
  };
}
