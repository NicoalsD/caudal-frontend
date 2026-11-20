import { useContext, useSyncExternalStore } from 'react';

import type { SessionState } from '../../core/session/SessionState';
import { SessionContext } from './sessionContext';

/** Reads the session store through useSyncExternalStore. Requires a SessionProvider. */
export function useSession(): SessionState {
  const store = useContext(SessionContext);
  if (store === null) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
