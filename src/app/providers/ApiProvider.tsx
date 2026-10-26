import type { JSX, ReactNode } from 'react';

import type { CaudalApi } from '../../services/api/CaudalApi';
import { ApiContext } from '../../state/hooks/apiContext';

interface ApiProviderProps {
  readonly api: CaudalApi;
  readonly children: ReactNode;
}

export function ApiProvider({ api, children }: ApiProviderProps): JSX.Element {
  return <ApiContext value={api}>{children}</ApiContext>;
}
