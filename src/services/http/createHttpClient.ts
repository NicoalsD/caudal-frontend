import type { Clock } from '../../core/time/Clock';
import type { Scheduler } from '../../core/time/Scheduler';
import type { SessionRefresher } from '../session/SessionRefresher';
import type { AccessTokenSource } from '../session/TokenStore';
import { AuthHttpClient } from './AuthHttpClient';
import { BaseFetchHttpClient } from './BaseFetchHttpClient';
import type { HttpClient } from './HttpClient';
import type { Logger } from './Logger';
import { LoggingHttpClient } from './LoggingHttpClient';
import { ReachabilityHttpClient } from './ReachabilityHttpClient';
import type { ReachabilityReporter } from './ReachabilityHttpClient';
import { RetryHttpClient } from './RetryHttpClient';
import { ExponentialBackoffRetryPolicy } from './RetryPolicy';

export interface HttpClientDependencies {
  readonly baseUrl: string;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly random: () => number;
  /** In-memory token and the object that renews it. Without it no Bearer is sent. */
  readonly auth?: {
    readonly tokens: AccessTokenSource;
    readonly refresher: SessionRefresher;
  };
  /** Told after every attempt whether the server answered, and the timer for slow answers. */
  readonly reachability?: {
    readonly reporter: ReachabilityReporter;
    readonly scheduler: Scheduler;
  };
}

/**
 * Composes the decorators, outermost first: Logging -> Retry -> Auth -> Reachability -> Fetch.
 * Logging is outermost so it records the final result of a call, not each retry.
 */
export function createHttpClient(dependencies: HttpClientDependencies): HttpClient {
  const fetchClient = new BaseFetchHttpClient({ baseUrl: dependencies.baseUrl });
  const transport =
    dependencies.reachability === undefined
      ? fetchClient
      : new ReachabilityHttpClient(
          fetchClient,
          dependencies.reachability.reporter,
          dependencies.reachability.scheduler,
        );
  const withAuth =
    dependencies.auth === undefined
      ? transport
      : new AuthHttpClient(transport, dependencies.auth.tokens, dependencies.auth.refresher);
  const withRetry = new RetryHttpClient(
    withAuth,
    new ExponentialBackoffRetryPolicy({ random: dependencies.random }),
  );
  return new LoggingHttpClient(withRetry, dependencies.logger, dependencies.clock);
}
