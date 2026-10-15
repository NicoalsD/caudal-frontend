import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';

import { App } from '../app/App';
import { createAppServices } from '../app/createAppServices';
import type { AppServices } from '../app/createAppServices';
import { buildRoutes } from '../app/router';
import type { SessionUser } from '../core/session/SessionState';
import { makeAccessToken } from './factories/auth';
import type { Scheduler } from '../core/time/Scheduler';
import type { Clock } from '../core/time/Clock';

const FAR_FUTURE_MS = 9_999_999_999_999;

function accessTokenFor(user: SessionUser): string {
  return makeAccessToken({
    id: user.userId,
    username: user.username,
    full_name: user.displayName,
    role: user.role,
    aqueduct_id: user.aqueductId,
    must_change_password: user.mustChangePassword,
  });
}

export interface RenderedApp {
  readonly services: AppServices;
  readonly router: ReturnType<typeof createMemoryRouter>;
}

/** The real app (router, guards, providers, services) over MSW, starting at `path`. */
export function renderApp(
  path: string,
  options: {
    readonly clock?: Clock;
    readonly scheduler?: Scheduler;
    readonly user?: SessionUser;
  } = {},
): RenderedApp {
  const services = createAppServices(
    { VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL },
    options.clock,
    options.scheduler,
  );
  if (options.user !== undefined) {
    // A real session has a token in memory; the fake servers read the role from its claims.
    services.tokens.set(accessTokenFor(options.user), FAR_FUTURE_MS);
    services.sessionStore.signIn(options.user);
  }
  services.queryClient.setDefaultOptions({
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  });
  const router = createMemoryRouter(buildRoutes(), { initialEntries: [path] });
  render(
    <App
      sessionStore={services.sessionStore}
      sessionController={services.session}
      router={router}
      api={services.api}
      queryClient={services.queryClient}
      offline={services.offline}
    />,
  );
  return { services, router };
}
