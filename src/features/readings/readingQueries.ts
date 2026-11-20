import { useMutation, useQuery } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import {
  SubmitReadingCommand,
  readSubmitReadingPayload,
} from '../../core/commands/SubmitReadingCommand';
import { REFERENCE_STALE_TIME_MS } from '../../core/policy/clientPolicy';
import type { CatalogItemView, ReadingCorrectionView } from '../../services/api/views';
import { GLOBAL_REFERENCE_SCOPE } from '../../core/cache/ReferenceFallback';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { useOfflineServices, useReferenceFetch } from '../../state/hooks/offlineContext';
import { useOutboxOwner } from '../../state/hooks/useOutboxOwner';

const NOT_QUEUED_MESSAGE = 'La lectura ya no está en la cola.';

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
    // Saving only writes to the local queue, so it must run without a connection. The default
    // 'online' mode would pause the mutation offline and leave the form on "Guardando...".
    networkMode: 'always',
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
        void offline.sync.flush();
      }
      return { clientId, sendingNow };
    },
  });
}

export interface CorrectionDraft {
  readonly readingId: string;
  readonly correctedGaugeValue: number;
  readonly reason: string;
}

/**
 * Corrects a reading the server already has (API.md 7.5). The reading id is the client UUID it was
 * sent with. Online only: a correction needs the server to answer.
 */
export function useCorrectReading(): UseMutationResult<
  ReadingCorrectionView,
  Error,
  CorrectionDraft
> {
  const api = useCaudalApi();
  return useMutation({
    mutationFn: (draft) =>
      api.readings.correct(draft.readingId, {
        correctedGaugeValue: draft.correctedGaugeValue,
        reason: draft.reason,
      }),
  });
}

export interface ResendDraft {
  /** The refused item being corrected. */
  readonly clientId: string;
  readonly gaugeValue: number;
  readonly ruleSetVersionId: string | null;
}

export interface ResendResult {
  readonly clientId: string;
  readonly sendingNow: boolean;
}

/**
 * Corrects a refused reading and sends it again as a new item (offline-sync.md 7.4). The refused
 * item leaves the queue at once: the server never stored it.
 */
export function useResendRejectedReading(): UseMutationResult<ResendResult, Error, ResendDraft> {
  const offline = useOfflineServices();
  const owner = useOutboxOwner();
  return useMutation({
    // Same as the save: it only rewrites the local queue.
    networkMode: 'always',
    mutationFn: async (draft) => {
      const refused = await offline.outbox.find(draft.clientId);
      const payload = refused === null ? null : readSubmitReadingPayload(refused.payload);
      if (payload === null) {
        throw new Error(NOT_QUEUED_MESSAGE);
      }
      const clientId = offline.ids.nextId();
      await offline.outbox.replace(
        draft.clientId,
        new SubmitReadingCommand(clientId, { ...payload, gaugeValue: draft.gaugeValue }),
        owner,
        draft.ruleSetVersionId,
      );
      const sendingNow = offline.connectivity.isOnline();
      if (sendingNow) {
        void offline.sync.flush();
      }
      return { clientId, sendingNow };
    },
  });
}

export interface DiscardDraft {
  readonly clientId: string;
  readonly reason: string;
}

/** Drops a refused reading, with the reason the person wrote (ux-guidelines section 6). */
export function useDiscardRejectedReading(): UseMutationResult<void, Error, DiscardDraft> {
  const offline = useOfflineServices();
  return useMutation({
    // Discarding only changes the local queue, so it works without a connection too.
    networkMode: 'always',
    mutationFn: (draft) => offline.outbox.discard(draft.clientId, draft.reason),
  });
}
