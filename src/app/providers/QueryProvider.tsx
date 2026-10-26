import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { JSX, ReactNode } from 'react';

interface QueryProviderProps {
  readonly client: QueryClient;
  readonly children: ReactNode;
}

export function QueryProvider({ client, children }: QueryProviderProps): JSX.Element {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
