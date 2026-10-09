import type { JSX } from 'react';
import { RouterProvider } from 'react-router/dom';
import type { createBrowserRouter } from 'react-router';

import type { SessionStore } from '../state/SessionStore';
import { SessionProvider } from './providers/SessionProvider';

interface AppProps {
  readonly sessionStore: SessionStore;
  readonly router: ReturnType<typeof createBrowserRouter>;
}

export function App({ sessionStore, router }: AppProps): JSX.Element {
  return (
    <SessionProvider store={sessionStore}>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}
