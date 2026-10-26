import {
  AUTHORIZATION_HEADER,
  BEARER_SCHEME,
  PUBLIC_PATH_PREFIX,
  SESSIONLESS_AUTH_PATHS,
} from '../../core/policy/clientPolicy';
import { NetworkError } from '../../core/errors/NetworkError';
import type { SessionRefresher } from '../session/SessionRefresher';
import type { AccessTokenSource } from '../session/TokenStore';
import { ApiError } from './errors';
import type { HttpClient, HttpRequest, HttpResponse } from './HttpClient';

const UNAUTHORIZED_STATUS = 401;

function carriesNoSession(request: HttpRequest): boolean {
  return (
    request.scope === 'root' ||
    request.path.startsWith(PUBLIC_PATH_PREFIX) ||
    SESSIONLESS_AUTH_PATHS.includes(request.path)
  );
}

/**
 * Decorator (P09): adds `Authorization: Bearer` from the in-memory token and, when the API answers
 * 401, renews the session once and repeats the call once (api-integration.md section 2.3).
 *
 * - The second 401 goes up to the caller: there is never a second refresh for the same call.
 * - Parallel calls that fail together wait for the same refresh promise.
 * - If another call already renewed the token while this one was failing, it just repeats.
 * - If the refresh fails, the original 401 goes up (the refresher already closed the session);
 *   a network failure while refreshing goes up as it is, so offline is not read as "expired".
 *
 * @pattern P09 Decorator
 */
export class AuthHttpClient implements HttpClient {
  private inFlightRefresh: Promise<void> | null = null;

  constructor(
    private readonly inner: HttpClient,
    private readonly tokens: AccessTokenSource,
    private readonly refresher: SessionRefresher,
  ) {}

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    const tokenSent = this.tokens.get();
    try {
      return await this.inner.request<T>(this.withToken(request, tokenSent));
    } catch (error) {
      if (!this.canRefreshAfter(request, error)) {
        throw error;
      }
      await this.renewSession(tokenSent, error);
      return this.inner.request<T>(this.withToken(request, this.tokens.get()));
    }
  }

  private canRefreshAfter(request: HttpRequest, error: unknown): boolean {
    return (
      error instanceof ApiError &&
      error.status === UNAUTHORIZED_STATUS &&
      !carriesNoSession(request)
    );
  }

  private async renewSession(tokenSent: string | null, original: unknown): Promise<void> {
    if (this.tokens.get() !== tokenSent) {
      return; // someone else renewed it while this call was in flight
    }
    this.inFlightRefresh ??= this.refresher.refresh().finally(() => {
      this.inFlightRefresh = null;
    });
    try {
      await this.inFlightRefresh;
    } catch (failure) {
      throw failure instanceof NetworkError ? failure : original;
    }
  }

  private withToken(request: HttpRequest, token: string | null): HttpRequest {
    if (token === null || carriesNoSession(request)) {
      return request;
    }
    return {
      ...request,
      headers: { ...request.headers, [AUTHORIZATION_HEADER]: `${BEARER_SCHEME} ${token}` },
    };
  }
}
