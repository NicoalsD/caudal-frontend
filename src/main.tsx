import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import './ui/styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { createAppServices } from './app/createAppServices';
import { prefetchReferences } from './app/providers/queryClient';
import { createAppRouter } from './app/router';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root element #root not found');
}

const services = createAppServices(import.meta.env);
void prefetchReferences(services.queryClient, services.api);

createRoot(container).render(
  <StrictMode>
    <App
      sessionStore={services.sessionStore}
      sessionController={services.session}
      router={createAppRouter()}
      api={services.api}
      queryClient={services.queryClient}
    />
  </StrictMode>,
);
