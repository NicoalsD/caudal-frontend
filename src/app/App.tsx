import type { QueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { RouterProvider } from 'react-router/dom';
import type { createBrowserRouter } from 'react-router';

import type { CaudalApi } from '../services/api/CaudalApi';
import type { SessionStore } from '../state/SessionStore';
import { ApiProvider } from './providers/ApiProvider';
import { QueryProvider } from './providers/QueryProvider';
import { SessionProvider } from './providers/SessionProvider';

interface AppProps {
  readonly sessionStore: SessionStore;
  readonly router: ReturnType<typeof createBrowserRouter>;
  readonly api: CaudalApi;
  readonly queryClient: QueryClient;
}

export function App({ sessionStore, router, api, queryClient }: AppProps): JSX.Element {
  return (
    <ApiProvider api={api}>
      <QueryProvider client={queryClient}>
        <SessionProvider store={sessionStore}>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryProvider>
    </ApiProvider>
  );
}
