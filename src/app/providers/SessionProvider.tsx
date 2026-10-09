import type { JSX, ReactNode } from 'react';

import type { SessionStore } from '../../state/SessionStore';
import { SessionContext } from '../../state/hooks/sessionContext';

interface SessionProviderProps {
  readonly store: SessionStore;
  readonly children: ReactNode;
}

export function SessionProvider({ store, children }: SessionProviderProps): JSX.Element {
  return <SessionContext value={store}>{children}</SessionContext>;
}
