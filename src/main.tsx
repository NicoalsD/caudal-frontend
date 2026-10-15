import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import './ui/styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { createAppServices } from './app/createAppServices';
import { prefetchReferences } from './app/providers/queryClient';
import { createAppRouter } from './app/router';
import { UpdatePrompt } from './app/pwa/UpdatePrompt';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root element #root not found');
}

const services = createAppServices(import.meta.env);
services.offline.connectivity.start();
services.offline.syncTrigger.start();
void prefetchReferences(services.queryClient, services.api);
// Once, here and not in an effect: StrictMode would run an effect twice and send two refreshes.
// The stored session hints are read first, so the offline mode never races with them.
void services.hintsReady.then(() => services.session.restore());

createRoot(container).render(
  <StrictMode>
    <App
      sessionStore={services.sessionStore}
      sessionController={services.session}
      router={createAppRouter()}
      api={services.api}
      queryClient={services.queryClient}
      offline={services.offline}
    />
    {/* Registers the service worker; the update offer never reloads the page by itself. */}
    <UpdatePrompt />
  </StrictMode>,
);
