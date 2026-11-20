import type { JSX, ReactNode } from 'react';

import type { OfflineServices } from '../../state/hooks/offlineContext';
import { OfflineContext } from '../../state/hooks/offlineContext';

interface OfflineProviderProps {
  readonly services: OfflineServices;
  readonly children: ReactNode;
}

export function OfflineProvider({ services, children }: OfflineProviderProps): JSX.Element {
  return <OfflineContext value={services}>{children}</OfflineContext>;
}
