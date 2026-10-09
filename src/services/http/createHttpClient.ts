import type { Clock } from '../../core/time/Clock';
import { BaseFetchHttpClient } from './BaseFetchHttpClient';
import type { HttpClient } from './HttpClient';
import type { Logger } from './Logger';
import { LoggingHttpClient } from './LoggingHttpClient';
import { RetryHttpClient } from './RetryHttpClient';
import { ExponentialBackoffRetryPolicy } from './RetryPolicy';

export interface HttpClientDependencies {
  readonly baseUrl: string;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly random: () => number;
}

/**
 * Composes the decorators, outermost first: Logging -> Retry -> (Auth, phase 3) -> Fetch.
 * Logging is outermost so it records the final result of a call, not each retry.
 */
export function createHttpClient(dependencies: HttpClientDependencies): HttpClient {
  const transport = new BaseFetchHttpClient({ baseUrl: dependencies.baseUrl });
  const withRetry = new RetryHttpClient(
    transport,
    new ExponentialBackoffRetryPolicy({ random: dependencies.random }),
  );
  return new LoggingHttpClient(withRetry, dependencies.logger, dependencies.clock);
}
