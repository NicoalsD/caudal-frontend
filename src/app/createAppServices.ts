import type { QueryClient } from '@tanstack/react-query';

import type { Clock } from '../core/time/Clock';
import { SystemClock } from '../core/time/SystemClock';
import { ApiDtoAdapter } from '../services/api/adapters/ApiDtoAdapter';
import { CaudalApi } from '../services/api/CaudalApi';
import { readApiBaseUrl } from '../services/api/config';
import { BaseFetchHttpClient } from '../services/http/BaseFetchHttpClient';
import { createHttpClient } from '../services/http/createHttpClient';
import { ConsoleLogger, NoopLogger } from '../services/http/Logger';
import { AuthApi } from '../services/api/endpoints/AuthApi';
import { SessionRefreshProxy } from '../services/session/SessionRefreshProxy';
import { TokenStore } from '../services/session/TokenStore';
import type { Scheduler } from '../core/time/Scheduler';
import { TimeoutScheduler } from '../core/time/Scheduler';
import { SessionController } from '../state/SessionController';
import { SessionStore } from '../state/SessionStore';
import { createQueryClient } from './providers/queryClient';

export interface AppEnvironment {
  readonly VITE_API_BASE_URL?: string;
  /** True in `vite dev`: only then requests are logged to the console. */
  readonly DEV?: boolean;
}

export interface AppServices {
  readonly api: CaudalApi;
  readonly tokens: TokenStore;
  readonly sessionStore: SessionStore;
  readonly session: SessionController;
  readonly queryClient: QueryClient;
}

/**
 * Composition root: wires the in-memory token, the decorated HTTP client, the facade, the session
 * and the query cache. Everything the app needs at run time is created here, once.
 */
export function createAppServices(
  env: AppEnvironment,
  clock: Clock = new SystemClock(),
  scheduler: Scheduler = new TimeoutScheduler(),
): AppServices {
  const baseUrl = readApiBaseUrl(env);
  const adapter = new ApiDtoAdapter();
  const tokens = new TokenStore();
  // The refresh call goes straight to the transport: it must not pass through AuthHttpClient.
  const refreshApi = new AuthApi(new BaseFetchHttpClient({ baseUrl }), adapter);
  const refresher = new SessionRefreshProxy(() => refreshApi.refresh(), tokens, clock);
  const http = createHttpClient({
    baseUrl,
    auth: { tokens, refresher },
    logger: env.DEV === true ? new ConsoleLogger() : new NoopLogger(),
    clock,
    random: () => Math.random(),
  });
  const api = new CaudalApi(http, adapter);
  const sessionStore = new SessionStore();
  // The query client is needed to build the controller, and the controller reads its errors.
  const errorSink = { handle: (_error: unknown): void => undefined };
  const queryClient = createQueryClient((error) => {
    errorSink.handle(error);
  });
  const session = new SessionController({
    api,
    tokens,
    store: sessionStore,
    refresher,
    queryClient,
    clock,
    scheduler,
  });
  errorSink.handle = (error) => {
    session.handleError(error);
  };
  return { api, tokens, sessionStore, session, queryClient };
}
