import { useSyncExternalStore } from 'react';

import type { OutboxSummary } from '../../core/commands/summarizeOutbox';
import { useOfflineServices } from './offlineContext';

/** The queue of the signed-in owner: counts and each item's status. Requires an OfflineProvider. */
export function useSyncQueue(): OutboxSummary {
  const { syncQueue } = useOfflineServices();
  return useSyncExternalStore(syncQueue.subscribe, syncQueue.getSnapshot, syncQueue.getSnapshot);
}
