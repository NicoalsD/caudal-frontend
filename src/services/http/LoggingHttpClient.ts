import type { Clock } from '../../core/time/Clock';
import { NetworkError } from '../../core/errors/NetworkError';
import { ApiError } from './errors';
import type { HttpClient, HttpRequest, HttpResponse } from './HttpClient';
import type { Logger } from './Logger';

export const HTTP_REQUEST_EVENT = 'http.request';

/**
 * Decorator (P09): records method, path, status, duration and request id of each logical call.
 * It never logs bodies, query strings, headers (Authorization, Cookie) or personal data.
 */
export class LoggingHttpClient implements HttpClient {
  constructor(
    private readonly inner: HttpClient,
    private readonly logger: Logger,
    private readonly clock: Clock,
  ) {}

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    const startedAt = this.clock.nowMs();
    const base = { method: request.method, path: request.path };
    try {
      const response = await this.inner.request<T>(request);
      this.logger.info(HTTP_REQUEST_EVENT, {
        ...base,
        status: response.status,
        durationMs: this.clock.nowMs() - startedAt,
        requestId: response.requestId,
      });
      return response;
    } catch (error) {
      const durationMs = this.clock.nowMs() - startedAt;
      if (error instanceof ApiError) {
        this.logger.warn(HTTP_REQUEST_EVENT, {
          ...base,
          status: error.status,
          code: error.code,
          durationMs,
          requestId: error.requestId,
        });
      } else {
        this.logger.warn(HTTP_REQUEST_EVENT, {
          ...base,
          status: null,
          code: error instanceof NetworkError ? 'NETWORK_ERROR' : 'UNKNOWN',
          durationMs,
          requestId: null,
        });
      }
      throw error;
    }
  }
}
