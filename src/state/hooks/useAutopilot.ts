import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { DecisionStatus } from '../../core/autopilot/autopilotModel';
import type {
  AssistantAnswerView,
  AutopilotDecisionView,
  AutopilotSettingsView,
} from '../../services/api/views';
import type { AutopilotSettingsInput } from '../../services/api/endpoints/AutopilotApi';
import { aqueductKey } from '../queryKeys';
import { useCaudalApi } from './apiContext';
import { useAqueductId } from './useAqueductId';
import { LIVE_REFETCH_INTERVAL_MS, LIVE_SCOPE } from './useLiveAqueduct';

export const AUTOPILOT_SCOPE = 'autopilot';

/** How many decisions the history asks for at most (a client display policy, not a rule). */
export const HISTORY_LIMIT = 20;

/** GET /autopilot/settings. `enabled` is false for people without ASSISTANT_USE. */
export function useAutopilotSettings(enabled = true): UseQueryResult<AutopilotSettingsView> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, AUTOPILOT_SCOPE, 'settings'),
    queryFn: () => api.autopilot.getSettings(),
    enabled,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });
}

/** PUT /autopilot/settings (AUTOPILOT_CONFIGURE). The saved settings replace the cached ones. */
export function useUpdateAutopilotSettings(): UseMutationResult<
  AutopilotSettingsView,
  Error,
  AutopilotSettingsInput
> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AutopilotSettingsInput) => api.autopilot.updateSettings(input),
    onSuccess: (saved) => {
      client.setQueryData(aqueductKey(aqueductId, AUTOPILOT_SCOPE, 'settings'), saved);
    },
  });
}

/** GET /autopilot/decisions for one status, kept fresh every 2 seconds (contract v2, D). */
export function useDecisions(
  status: DecisionStatus | undefined,
  enabled = true,
): UseQueryResult<AutopilotDecisionView[]> {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  return useQuery({
    queryKey: aqueductKey(aqueductId, AUTOPILOT_SCOPE, 'decisions', status ?? 'ALL'),
    queryFn: () =>
      api.autopilot.decisions({
        ...(status === undefined ? {} : { status }),
        limit: HISTORY_LIMIT,
      }),
    enabled,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });
}

/** Accept and reject a recommendation. Both read the decisions and the valves again. */
export function useDecisionActions(): {
  readonly accept: UseMutationResult<AutopilotDecisionView, Error, string>;
  readonly reject: UseMutationResult<AutopilotDecisionView, Error, string>;
} {
  const api = useCaudalApi();
  const aqueductId = useAqueductId();
  const client = useQueryClient();
  const refresh = async (): Promise<void> => {
    await Promise.all([
      client.invalidateQueries({ queryKey: aqueductKey(aqueductId, AUTOPILOT_SCOPE, 'decisions') }),
      client.invalidateQueries({ queryKey: aqueductKey(aqueductId, LIVE_SCOPE, 'valves') }),
    ]);
  };
  const accept = useMutation({
    mutationFn: (id: string) => api.autopilot.accept(id),
    onSuccess: refresh,
  });
  const reject = useMutation({
    mutationFn: (id: string) => api.autopilot.reject(id),
    onSuccess: refresh,
  });
  return { accept, reject };
}

/** POST /assistant/ask. */
export function useAskAssistant(): UseMutationResult<AssistantAnswerView, Error, string> {
  const api = useCaudalApi();
  return useMutation({ mutationFn: (question: string) => api.autopilot.ask(question) });
}
