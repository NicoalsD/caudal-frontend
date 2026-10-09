export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface HttpRequest {
  readonly method: HttpMethod;
  /** Relative to the API base, for example "/readings". Always starts with "/". */
  readonly path: string;
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

/** Component interface of the Decorator pattern (P09): every layer implements and wraps it. */
export interface HttpClient {
  request<T>(request: HttpRequest): Promise<HttpResponse<T>>;
}
