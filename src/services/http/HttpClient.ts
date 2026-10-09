export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface HttpRequest {
  readonly method: HttpMethod;
  /** Relative to the API base, for example "/readings". Always starts with "/". */
  readonly path: string;
  /**
   * "api" (default) resolves against the API base (/api/v1). "root" resolves against the origin
   * of the API, for the few routes outside the prefix such as /actuator/health (API.md 1.1).
   */
  readonly scope?: 'api' | 'root';
  readonly query?: Readonly<Record<string, string | number>>;
  /** Plain data, sent as JSON. Build it field by field: the API rejects unknown fields. */
  readonly body?: unknown;
  /**
   * Marks a write as safe to repeat: its client UUID travels in the body (`id`), so the server
   * answers the same for a replay. Without it only GET is retried. It is not sent as a header.
   */
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
}

export interface HttpResponse<T> {
  readonly status: number;
  readonly body: T;
  /** Value of X-Request-Id, for support codes and logs. */
  readonly requestId: string | null;
}

/**
 * Component interface of the Decorator pattern: every layer implements and wraps it.
 *
 * @pattern P09 Decorator
 */
export interface HttpClient {
  request<T>(request: HttpRequest): Promise<HttpResponse<T>>;
}
