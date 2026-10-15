import { createContext, useContext } from 'react';

import type { Clock } from '../../core/time/Clock';
import type { IdGenerator } from '../../core/ids/IdGenerator';
import type { CommandQueue } from '../../core/commands/CommandQueue';
import type { ReferenceFallback } from '../../core/cache/ReferenceFallback';
import type { OutboxSync } from '../OutboxSync';
import type { ConnectivityMonitor } from '../ConnectivityMonitor';
import type { SyncQueueStore } from '../SyncQueueStore';

/** What the offline features need: the queue, its sender, the clock and the client ids. */
export interface OfflineServices {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly outbox: CommandQueue;
  readonly sync: OutboxSync;
  /** Reference data read from the API and kept for offline use (offline-sync.md section 10). */
  readonly reference: ReferenceFallback;
  /** Online or offline, from the browser's events. */
  readonly connectivity: ConnectivityMonitor;
  /** The queue of the signed-in owner, observable for the status bar. */
  readonly syncQueue: SyncQueueStore;
}

export const OfflineContext = createContext<OfflineServices | null>(null);

/** The offline services of the composition root. Requires an OfflineProvider. */
export function useOfflineServices(): OfflineServices {
  const services = useContext(OfflineContext);
  if (services === null) {
    throw new Error('useOfflineServices must be used inside an OfflineProvider');
  }
  return services;
}

/** Fetches a reference through the offline cache when there is one, and straight from the API otherwise. */
export type ReferenceFetch = <T>(
  scope: string,
  name: string,
  remote: () => Promise<T>,
) => Promise<T>;

export function useReferenceFetch(): ReferenceFetch {
  const services = useContext(OfflineContext);
  return services === null
    ? (_scope, _name, remote) => remote()
    : (scope, name, remote) => services.reference.fetch(scope, name, remote);
}
