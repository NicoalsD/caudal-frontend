import {
  AUTH_PATH_PREFIX,
  FIRST_NON_SUCCESS_STATUS,
  NO_CONTENT_STATUS,
  REQUEST_ID_HEADER,
  REQUESTED_WITH_HEADER,
  REQUESTED_WITH_VALUE,
  SERVER_ERROR_MIN_STATUS,
} from '../../core/policy/clientPolicy';
import { NetworkError } from '../../core/errors/NetworkError';
import { ApiError, isAbortError, UNEXPECTED_RESPONSE_CODE } from './errors';
import type { HttpClient, HttpRequest, HttpResponse } from './HttpClient';

const DECIMAL_RADIX = 10;
const RETRY_AFTER_HEADER = 'Retry-After';
const INTERNAL_ERROR_CODE = 'INTERNAL_ERROR';
const UNEXPECTED_MESSAGE = 'Respuesta inesperada del servidor.';

interface ErrorEnvelope {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly request_id?: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }
  const { code, message, details, request_id: requestId } = value.error;
  return (
    typeof code === 'string' &&
    typeof message === 'string' &&
    (details === undefined || isRecord(details)) &&
    (requestId === undefined || typeof requestId === 'string')
  );
}

function parseRetryAfter(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const seconds = Number.parseInt(value, DECIMAL_RADIX);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

export interface BaseFetchHttpClientOptions {
  /** API base including the version prefix, for example http://localhost:8080/api/v1. */
  readonly baseUrl: string;
  /** Injected for tests; defaults to the global fetch. */
  readonly fetchFn?: typeof fetch;
}

/**
 * The only class that calls `fetch`. It builds the URL, sends the mandatory headers, parses
 * JSON and turns every failure into a typed error: ApiError or NetworkError.
 * It is the innermost component of the decorator chain.
 *
 * @pattern P09 Decorator
 */
export class BaseFetchHttpClient implements HttpClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: BaseFetchHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args));
  }

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    const response = await this.send(request);
    const requestId = response.headers.get(REQUEST_ID_HEADER);
    const payload = await this.readBody(response, requestId);

    if (response.status >= FIRST_NON_SUCCESS_STATUS) {
      throw this.toApiError(response, payload, requestId);
    }
    return { status: response.status, body: payload as T, requestId };
  }

  private async send(request: HttpRequest): Promise<Response> {
    const headers = new Headers({
      Accept: 'application/json',
      [REQUESTED_WITH_HEADER]: REQUESTED_WITH_VALUE,
    });
    const init: RequestInit = {
      method: request.method,
      headers,
      // The refresh cookie only travels to /auth/*; everything else is sent without credentials.
      credentials: request.path.startsWith(AUTH_PATH_PREFIX) ? 'include' : 'omit',
    };
    if (request.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      init.body = JSON.stringify(request.body);
    }
    if (request.signal !== undefined) {
      init.signal = request.signal;
    }

    const url = this.buildUrl(request);
    try {
      return await this.fetchFn(url, init);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      throw new NetworkError({ cause: error });
    }
  }

  private buildUrl(request: HttpRequest): string {
    if (!request.path.startsWith('/')) {
      throw new Error(`Request path must start with "/": ${request.path}`);
    }
    const root = request.scope === 'root' ? new URL(this.baseUrl).origin : this.baseUrl;
    const url = new URL(`${root}${request.path}`);
    for (const [name, value] of Object.entries(request.query ?? {})) {
      url.searchParams.set(name, String(value));
    }
    return url.toString();
  }

  /** Returns the parsed JSON, undefined for an empty body, or the raw text when it is not JSON. */
  private async readBody(response: Response, requestId: string | null): Promise<unknown> {
    if (response.status === NO_CONTENT_STATUS) {
      return undefined;
    }
    const text = await response.text();
    if (text === '') {
      return undefined;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      if (response.status < FIRST_NON_SUCCESS_STATUS) {
        throw new ApiError(
          response.status,
          UNEXPECTED_RESPONSE_CODE,
          UNEXPECTED_MESSAGE,
          {},
          requestId,
        );
      }
      return text;
    }
  }

  private toApiError(
    response: Response,
    payload: unknown,
    headerRequestId: string | null,
  ): ApiError {
    const retryAfter = parseRetryAfter(response.headers.get(RETRY_AFTER_HEADER));
    if (isErrorEnvelope(payload)) {
      const { code, message, details, request_id: bodyRequestId } = payload.error;
      return new ApiError(
        response.status,
        code,
        message,
        details ?? {},
        headerRequestId ?? bodyRequestId ?? null,
        retryAfter,
      );
    }
    const code =
      response.status >= SERVER_ERROR_MIN_STATUS ? INTERNAL_ERROR_CODE : UNEXPECTED_RESPONSE_CODE;
    return new ApiError(response.status, code, UNEXPECTED_MESSAGE, {}, headerRequestId, retryAfter);
  }
}
