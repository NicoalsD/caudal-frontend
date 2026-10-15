import type { JSX, ReactNode } from 'react';

import type { SessionController } from '../../state/SessionController';
import type { SessionStore } from '../../state/SessionStore';
import { SessionActionsContext } from '../../state/hooks/sessionActionsContext';
import { SessionContext } from '../../state/hooks/sessionContext';

interface SessionProviderProps {
  readonly store: SessionStore;
  /** Screens that only read the session (guards, layouts) do not need the actions. */
  readonly controller?: SessionController;
  readonly children: ReactNode;
}

export function SessionProvider({
  store,
  controller,
  children,
}: SessionProviderProps): JSX.Element {
  return (
    <SessionContext value={store}>
      <SessionActionsContext value={controller ?? null}>{children}</SessionActionsContext>
    </SessionContext>
  );
}
