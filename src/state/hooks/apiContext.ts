import { createContext, useContext } from 'react';

import type { CaudalApi } from '../../services/api/CaudalApi';

export const ApiContext = createContext<CaudalApi | null>(null);

/** The facade for hooks. Components never build HTTP requests themselves. */
export function useCaudalApi(): CaudalApi {
  const api = useContext(ApiContext);
  if (api === null) {
    throw new Error('useCaudalApi must be used inside an ApiProvider');
  }
  return api;
}
