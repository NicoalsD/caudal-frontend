import { useMutation, useQuery } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { SubmitReadingCommand } from '../../core/commands/SubmitReadingCommand';
import { REFERENCE_STALE_TIME_MS } from '../../core/policy/clientPolicy';
import type { CatalogItemView } from '../../services/api/views';
import { GLOBAL_REFERENCE_SCOPE } from '../../core/cache/ReferenceFallback';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { useOfflineServices, useReferenceFetch } from '../../state/hooks/offlineContext';
import { useOutboxOwner } from '../../state/hooks/useOutboxOwner';

/** GET /catalogs/WATER_APPEARANCE: the options for how the water looks. Changes rarely. */
export function useWaterAppearances(): UseQueryResult<CatalogItemView[]> {
  const api = useCaudalApi();
  const fetchReference = useReferenceFetch();
  return useQuery({
    queryKey: ['catalogs', 'WATER_APPEARANCE'],
    queryFn: () =>
      fetchReference(GLOBAL_REFERENCE_SCOPE, 'catalog:WATER_APPEARANCE', () =>
        api.meta.catalog('WATER_APPEARANCE'),
      ),
    staleTime: REFERENCE_STALE_TIME_MS,
    networkMode: 'always',
    refetchOnWindowFocus: false,
  });
}

export interface SaveReadingDraft {
  readonly tankId: string;
  readonly gaugeValue: number;
  readonly waterAppearanceCode: string;
  readonly damageNoticed: boolean;
  readonly note: string;
  readonly ruleSetVersionId: string | null;
}

export interface SavedReading {
  readonly clientId: string;
  /** True when the phone had a connection at save time, so a send starts now. */
  readonly sendingNow: boolean;
}

/**
 * Save first, send later (offline-sync.md): the reading goes into the queue with its client id and
 * its capture time, then a send starts if the phone has a connection. The form never waits for
 * the server.
 */
export function useSaveReading(): UseMutationResult<SavedReading, Error, SaveReadingDraft> {
  const offline = useOfflineServices();
  const owner = useOutboxOwner();
  return useMutation({
    mutationFn: async (draft) => {
      const clientId = offline.ids.nextId();
      const command = new SubmitReadingCommand(clientId, {
        tankId: draft.tankId,
        gaugeValue: draft.gaugeValue,
        waterAppearanceCode: draft.waterAppearanceCode,
        damageNoticed: draft.damageNoticed,
        note: draft.note,
        observedAt: new Date(offline.clock.nowMs()).toISOString(),
      });
      await offline.outbox.enqueue(command, owner, draft.ruleSetVersionId);
      const sendingNow = offline.connectivity.isOnline();
      if (sendingNow) {
        void offline.sync.flush(owner);
      }
      return { clientId, sendingNow };
    },
  });
}
