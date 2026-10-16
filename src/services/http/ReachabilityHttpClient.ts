import { SLOW_SERVER_ANSWER_MS } from '../../core/policy/clientPolicy';
import { isServerUnreachable } from '../../core/policy/queryRetry';
import type { Scheduler } from '../../core/time/Scheduler';
import type { HttpClient, HttpRequest, HttpResponse } from './HttpClient';

/** Told after every attempt whether the server answered (implemented by state/ServerReachability). */
export interface ReachabilityReporter {
  reportReachable(): void;
  reportUnreachable(): void;
}

/**
 * Decorator (P09): reports whether each attempt reached the server. It sits next to the transport,
 * so every retry counts, and it never changes the answer or the error. A sleeping server may also
 * hold the request open while it starts, so an attempt without an answer after a few seconds
 * counts as unreachable until it settles.
 *
 * @pattern P09 Decorator
 */
export class ReachabilityHttpClient implements HttpClient {
  constructor(
    private readonly inner: HttpClient,
    private readonly reporter: ReachabilityReporter,
    private readonly scheduler: Scheduler,
    private readonly slowAfterMs: number = SLOW_SERVER_ANSWER_MS,
  ) {}

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    const cancelSlowNotice = this.scheduler.after(this.slowAfterMs, () => {
      this.reporter.reportUnreachable();
    });
    try {
      const response = await this.inner.request<T>(request);
      this.reporter.reportReachable();
      return response;
    } catch (error) {
      if (isServerUnreachable(error)) {
        this.reporter.reportUnreachable();
      } else {
        // An error answer still came from the server: it is awake.
        this.reporter.reportReachable();
      }
      throw error;
    } finally {
      cancelSlowNotice();
    }
  }
}
