import { isAbortError } from './errors';
import type { HttpClient, HttpRequest, HttpResponse } from './HttpClient';
import type { RetryPolicy } from './RetryPolicy';

export type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>;

/** Waits `ms`, and rejects with the abort reason if the signal fires first. */
export const sleep: Sleep = (ms, signal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(signal.reason as Error);
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason as Error);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

/**
 * Decorator (P09): repeats transient failures of repeatable requests. It sits outside the
 * authentication decorator, so each attempt goes through it and uses the current token.
 */
export class RetryHttpClient implements HttpClient {
  constructor(
    private readonly inner: HttpClient,
    private readonly policy: RetryPolicy,
    private readonly wait: Sleep = sleep,
  ) {}

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.inner.request<T>(request);
      } catch (error) {
        if (isAbortError(error) || !this.policy.shouldRetry(request, error, attempt)) {
          throw error;
        }
        await this.wait(this.policy.delayMs(attempt), request.signal);
      }
    }
  }
}
