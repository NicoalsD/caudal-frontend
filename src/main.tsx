import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import './ui/styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { createQueryClient, prefetchReferences } from './app/providers/queryClient';
import { createAppRouter } from './app/router';
import { createCaudalApi } from './services/api/createCaudalApi';
import { SessionStore } from './state/SessionStore';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root element #root not found');
}

const api = createCaudalApi(import.meta.env);
const queryClient = createQueryClient();
void prefetchReferences(queryClient, api);

createRoot(container).render(
  <StrictMode>
    <App
      sessionStore={new SessionStore()}
      router={createAppRouter()}
      api={api}
      queryClient={queryClient}
    />
  </StrictMode>,
);
