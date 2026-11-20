import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import type { ValveAction } from '../../core/valves/valveModel';
import type { ValveCommandView } from '../../services/api/views';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useAqueductId } from './useAqueductId';
import { LIVE_SCOPE } from './useLiveAqueduct';

/** How long a manual command waits for the actuator before it expires (client policy). */
const COMMAND_WINDOW_MINUTES = 5;
const MS_PER_MINUTE = 60_000;
export const COMMAND_WINDOW_MS = COMMAND_WINDOW_MINUTES * MS_PER_MINUTE;

export interface ValveCommandRequest {
  readonly valveId: string;
  readonly action: ValveAction;
  readonly reason: string;
}

/**
 * POST /valve-commands/manual (VALVE_COMMAND_MANUAL). The command starts as PENDING, runs from
 * now and expires after COMMAND_WINDOW_MS. The live valves are read again at once, so the new
 * command shows in the scene without waiting for the next tick.
 */
export function useSendValveCommand(): UseMutationResult<
  ValveCommandView,
  Error,
  ValveCommandRequest
> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: ValveCommandRequest) => {
      const notBefore = new Date();
      return api.valvesLive.sendManual({
        valveId: request.valveId,
        action: request.action,
        reason: request.reason,
        notBefore,
        expiresAt: new Date(notBefore.getTime() + COMMAND_WINDOW_MS),
      });
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: aqueductKey(aqueductId, LIVE_SCOPE, 'valves') }),
  });
}
