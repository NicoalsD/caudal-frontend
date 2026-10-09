import { createContext } from 'react';

import type { SessionStore } from '../SessionStore';

export const SessionContext = createContext<SessionStore | null>(null);
