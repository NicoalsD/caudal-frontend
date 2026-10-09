import {
  HTTP_RETRY_BACKOFF_FACTOR,
  HTTP_RETRY_BASE_DELAY_MS,
  HTTP_RETRY_JITTER_RATIO,
  HTTP_RETRY_MAX_ATTEMPTS,
  HTTP_RETRY_MAX_DELAY_MS,
  SERVER_ERROR_MIN_STATUS,
} from '../../core/policy/clientPolicy';
import { NetworkError } from '../../core/errors/NetworkError';
import { ApiError } from './errors';
import type { HttpRequest } from './HttpClient';

export interface RetryPolicy {
  /** Whether `request` failed with `error` on attempt number `attempt` (1-based) may be repeated. */
  shouldRetry(request: HttpRequest, error: unknown, attempt: number): boolean;
  /** Milliseconds to wait before the next attempt. */
  delayMs(attempt: number): number;
}

export interface BackoffOptions {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly factor: number;
  readonly jitterRatio: number;
  /** Returns a number in [0, 1). Injected so tests are deterministic. */
  readonly random: () => number;
}

/** Retries only repeatable requests, after a network failure or a 5xx, with exponential backoff. */
export class ExponentialBackoffRetryPolicy implements RetryPolicy {
  private readonly options: BackoffOptions;

  constructor(options: Partial<BackoffOptions> & Pick<BackoffOptions, 'random'>) {
    this.options = {
      maxAttempts: HTTP_RETRY_MAX_ATTEMPTS,
      baseDelayMs: HTTP_RETRY_BASE_DELAY_MS,
      maxDelayMs: HTTP_RETRY_MAX_DELAY_MS,
      factor: HTTP_RETRY_BACKOFF_FACTOR,
      jitterRatio: HTTP_RETRY_JITTER_RATIO,
      ...options,
    };
  }

  shouldRetry(request: HttpRequest, error: unknown, attempt: number): boolean {
    if (attempt >= this.options.maxAttempts) {
      return false;
    }
    const repeatable = request.method === 'GET' || request.idempotencyKey !== undefined;
    const transient =
      error instanceof NetworkError ||
      (error instanceof ApiError && error.status >= SERVER_ERROR_MIN_STATUS);
    return repeatable && transient;
  }

  delayMs(attempt: number): number {
    const { baseDelayMs, maxDelayMs, factor, jitterRatio, random } = this.options;
    const capped = Math.min(maxDelayMs, baseDelayMs * factor ** (attempt - 1));
    return Math.round(capped * (1 + jitterRatio * random()));
  }
}
