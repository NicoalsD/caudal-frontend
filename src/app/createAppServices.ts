import type { QueryClient } from '@tanstack/react-query';

import type { SessionHintRepository } from '../core/session/SessionHint';
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
import { OfflineDatabase } from '../services/offline/OfflineDatabase';
import { IndexedSessionHintRepository } from '../services/offline/IndexedSessionHintRepository';
import { IndexedOutboxRepository } from '../services/offline/IndexedOutboxRepository';
import { CryptoIdGenerator } from '../services/ids/CryptoIdGenerator';
import { CommandQueue } from '../core/commands/CommandQueue';
import { OutboxSync } from '../state/OutboxSync';
import type { OfflineServices } from '../state/hooks/offlineContext';
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
  /** Session hints per aqueduct (no secrets). Exposed for the local mode and for tests. */
  readonly hints: SessionHintRepository;
  /** Loads the stored hints into memory; await it before reading hints at boot. */
  readonly hintsReady: Promise<void>;
  /** Reading queue and its sender (offline-sync.md). */
  readonly offline: OfflineServices;
}

/**
 * Composition root: wires the in-memory token, the decorated HTTP client, the facade, the session
 * and the query cache. Everything the app needs at run time is created here, once.
 */
export function createAppServices(
  env: AppEnvironment,
  clock: Clock = new SystemClock(),
  scheduler: Scheduler = new TimeoutScheduler(),
  hints?: IndexedSessionHintRepository,
): AppServices {
  const baseUrl = readApiBaseUrl(env);
  const adapter = new ApiDtoAdapter();
  const logger = env.DEV === true ? new ConsoleLogger() : new NoopLogger();
  // Hints live in IndexedDB; a failed write is logged and never blocks the sign-in.
  const hintStore =
    hints ??
    new IndexedSessionHintRepository(OfflineDatabase.shared, (error) => {
      logger.warn('hints.write_failed', { error: String(error) });
    });
  const tokens = new TokenStore();
  // The refresh call goes straight to the transport: it must not pass through AuthHttpClient.
  const refreshApi = new AuthApi(new BaseFetchHttpClient({ baseUrl }), adapter);
  const refresher = new SessionRefreshProxy(() => refreshApi.refresh(), tokens, clock);
  const http = createHttpClient({
    baseUrl,
    auth: { tokens, refresher },
    logger,
    clock,
    random: () => Math.random(),
  });
  const api = new CaudalApi(http, adapter);
  const sessionStore = new SessionStore((event, phase) => {
    logger.warn('session.event_ignored', { event, phase });
  });
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
    hints: hintStore,
  });
  errorSink.handle = (error) => {
    session.handleError(error);
  };
  const hintsReady = hintStore.load().catch((error: unknown) => {
    logger.warn('hints.load_failed', { error: String(error) });
  });
  const outbox = new CommandQueue(new IndexedOutboxRepository(OfflineDatabase.shared), clock);
  const offline: OfflineServices = {
    clock,
    ids: new CryptoIdGenerator(),
    outbox,
    sync: new OutboxSync(outbox, api.readings),
  };
  return {
    api,
    tokens,
    sessionStore,
    session,
    queryClient,
    hints: hintStore,
    hintsReady,
    offline,
  };
}
