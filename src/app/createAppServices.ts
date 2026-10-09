import type { QueryClient } from '@tanstack/react-query';

import type { Clock } from '../core/time/Clock';
import { SystemClock } from '../core/time/SystemClock';
import { ApiDtoAdapter } from '../services/api/adapters/ApiDtoAdapter';
import { CaudalApi } from '../services/api/CaudalApi';
import { readApiBaseUrl } from '../services/api/config';
import { createHttpClient } from '../services/http/createHttpClient';
import { ConsoleLogger, NoopLogger } from '../services/http/Logger';
import { TokenStore } from '../services/session/TokenStore';
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
): AppServices {
  const tokens = new TokenStore();
  const http = createHttpClient({
    baseUrl: readApiBaseUrl(env),
    logger: env.DEV === true ? new ConsoleLogger() : new NoopLogger(),
    clock,
    random: () => Math.random(),
  });
  const api = new CaudalApi(http, new ApiDtoAdapter());
  const sessionStore = new SessionStore();
  const queryClient = createQueryClient();
  const session = new SessionController({ api, tokens, store: sessionStore, clock });
  return { api, tokens, sessionStore, session, queryClient };
}
