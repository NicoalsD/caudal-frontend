import { createContext, useContext } from 'react';

import type { Clock } from '../../core/time/Clock';
import type { IdGenerator } from '../../core/ids/IdGenerator';
import type { CommandQueue } from '../../core/commands/CommandQueue';
import type { OutboxSync } from '../OutboxSync';

/** What the offline features need: the queue, its sender, the clock and the client ids. */
export interface OfflineServices {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly outbox: CommandQueue;
  readonly sync: OutboxSync;
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
