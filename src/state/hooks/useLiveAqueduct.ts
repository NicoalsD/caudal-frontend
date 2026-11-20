import { useQuery } from '@tanstack/react-query';

import { levelFraction } from '../../core/scene/flow';
import { buildLiveValves } from '../../core/scene/sceneModel';
import type { LiveValve } from '../../core/scene/sceneModel';
import type { NetworkRoot } from '../../core/network/nodes';
import type { RuleSetView, TankStatusView, TankView } from '../../services/api/views';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useCurrentRuleSet } from './useCurrentRuleSet';
import { useNetwork } from './useNetwork';
import { useAqueductId } from './useAqueductId';
import { useActiveTank } from './useTankStatus';

/** The scene is a live board: level and valves are asked again this often (contract v2, D). */
export const LIVE_REFETCH_INTERVAL_MS = 2000;

export const LIVE_SCOPE = 'live';

export interface LiveAqueduct {
  readonly tank: TankView;
  readonly network: NetworkRoot;
  /** Last level in meters, or null while the tank has no reading. */
  readonly level: number | null;
  /** The level inside the gauge range, 0 to 1. */
  readonly levelFraction: number;
  readonly status: TankStatusView | null;
  readonly rules: RuleSetView | null;
  readonly valves: readonly LiveValve[];
  /** False when GET /valves/live failed: the valves are then drawn as UNKNOWN. */
  readonly valvesAreLive: boolean;
}

export type LiveAqueductState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: unknown; readonly retry: () => void }
  | { readonly status: 'empty' }
  | { readonly status: 'ready'; readonly aqueduct: LiveAqueduct };

/**
 * Everything the 3D scene and the valve lists draw: the network (tank, sectors, valves), the
 * level of the tank and the state of the valves, the last two asked again every 2 seconds. A
 * failure of the live valves does not hide the tank.
 */
export function useLiveAqueduct(): LiveAqueductState {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  const active = useActiveTank();
  const network = useNetwork();
  const rules = useCurrentRuleSet();
  const tankId = active.status === 'ready' ? active.tank.id : '';

  const status = useQuery({
    queryKey: aqueductKey(aqueductId, LIVE_SCOPE, 'status', tankId),
    queryFn: () => api.tankStatus.get(tankId),
    enabled: tankId !== '',
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });
  const valves = useQuery({
    queryKey: aqueductKey(aqueductId, LIVE_SCOPE, 'valves'),
    queryFn: () => api.valvesLive.list(),
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });

  if (active.status === 'loading' || network.status === 'loading') {
    return { status: 'loading' };
  }
  if (active.status === 'error') {
    return { status: 'error', error: active.error, retry: active.retry };
  }
  if (network.status === 'error') {
    return { status: 'error', error: network.error, retry: network.retry };
  }
  if (active.status === 'empty') {
    return { status: 'empty' };
  }

  const { tank } = active;
  const level = status.data?.level?.value.value ?? null;
  const fraction = level === null ? 0 : levelFraction(level, tank.gaugeMin, tank.gaugeMax);
  const facts = (valves.data ?? []).map((item) => ({
    valveId: item.valveId,
    state: item.state,
    lastCommand:
      item.lastCommand === null
        ? null
        : {
            id: item.lastCommand.id,
            action: item.lastCommand.action,
            status: item.lastCommand.status,
          },
  }));
  return {
    status: 'ready',
    aqueduct: {
      tank,
      network: network.root,
      level,
      levelFraction: fraction,
      status: status.data ?? null,
      rules: rules.data ?? null,
      valves: buildLiveValves(network.root, facts, fraction),
      valvesAreLive: valves.isSuccess,
    },
  };
}
