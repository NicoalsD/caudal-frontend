import { createContext, useContext } from 'react';

import type { SessionController } from '../SessionController';

export const SessionActionsContext = createContext<SessionController | null>(null);

/** The session actions (sign in, sign out, ...). Components never touch tokens. */
export function useSessionActions(): SessionController {
  const controller = useContext(SessionActionsContext);
  if (controller === null) {
    throw new Error('useSessionActions must be used inside a SessionProvider with a controller');
  }
  return controller;
}
