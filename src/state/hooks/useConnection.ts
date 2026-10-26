import { useSyncExternalStore } from 'react';

import type { ConnectionName } from '../../core/connection/ConnectionState';
import { useOfflineServices } from './offlineContext';

/** ONLINE or OFFLINE, updated as the browser reports it. Requires an OfflineProvider. */
export function useConnection(): ConnectionName {
  const { connectivity } = useOfflineServices();
  return useSyncExternalStore(
    connectivity.subscribe,
    connectivity.getSnapshot,
    connectivity.getSnapshot,
  );
}
