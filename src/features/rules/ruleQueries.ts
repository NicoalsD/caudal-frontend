import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { RuleSetChanges } from '../../core/rules/ruleSetParts';
import type { RuleSetSummaryView, RuleSetView } from '../../services/api/views';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { RULE_SETS_SCOPE } from '../../state/hooks/useCurrentRuleSet';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { aqueductKey } from '../../state/queryKeys';

/** Query keys of the rules feature; all carry the aqueduct id (architecture.md section 6.2). */
export function useRuleKeys() {
  const aqueductId = useAqueductId();
  return {
    all: aqueductKey(aqueductId, RULE_SETS_SCOPE),
    current: aqueductKey(aqueductId, RULE_SETS_SCOPE, 'current'),
    openDraft: aqueductKey(aqueductId, RULE_SETS_SCOPE, 'open-draft'),
    detail: (id: string) => aqueductKey(aqueductId, RULE_SETS_SCOPE, 'detail', id),
  };
}

/** The open draft, if any: there is at most one per aqueduct. */
export function useOpenDraft(): UseQueryResult<RuleSetSummaryView | null> {
  const api = useCaudalApi();
  const keys = useRuleKeys();
  return useQuery({
    queryKey: keys.openDraft,
    queryFn: async () => (await api.rules.list('DRAFT'))[0] ?? null,
    refetchOnWindowFocus: false,
  });
}

export function useRuleSet(id: string): UseQueryResult<RuleSetView> {
  const api = useCaudalApi();
  const keys = useRuleKeys();
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => api.rules.get(id),
    refetchOnWindowFocus: false,
  });
}

/** POST /rule-sets: creates the draft copied from the active version. */
export function useCreateDraft(): UseMutationResult<RuleSetView, Error, void> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const keys = useRuleKeys();
  return useMutation({
    mutationFn: () => api.rules.createDraft(),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.openDraft });
    },
  });
}

/** PATCH /rule-sets/{id}: saves the lists that changed in the draft. */
export function useSaveDraft(id: string): UseMutationResult<RuleSetView, Error, RuleSetChanges> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const keys = useRuleKeys();
  return useMutation({
    mutationFn: (changes) => api.rules.updateDraft(id, changes),
    onSuccess: (saved) => {
      client.setQueryData(keys.detail(id), saved);
    },
  });
}

/** POST /rule-sets/{id}/activate: the new version becomes the rules everything else reads. */
export function useActivateRuleSet(id: string): UseMutationResult<RuleSetView, Error, string> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const keys = useRuleKeys();
  return useMutation({
    mutationFn: (reason) => api.rules.activate(id, reason),
    onSuccess: async () => {
      // Forms of other screens read the gauge and limits of the active rules: refresh them all.
      await client.invalidateQueries({ queryKey: keys.all });
    },
  });
}
