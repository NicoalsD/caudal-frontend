import { describe, expect, it, vi } from 'vitest';

import { NetworkError } from '../../core/errors/NetworkError';
import { STATUS } from '../../test/constants';
import { FakeHttpClient, okResponse } from '../../test/fakes/FakeHttpClient';
import type { SessionRefresher } from '../session/SessionRefresher';
import { TokenStore } from '../session/TokenStore';
import { AuthHttpClient } from './AuthHttpClient';
import { ApiError } from './errors';
import type { HttpClient, HttpRequest, HttpResponse } from './HttpClient';

const OLD_TOKEN = 'token-viejo';
const NEW_TOKEN = 'token-nuevo';
const FAR_FUTURE = 9_999_999_999_999;
const PARALLEL_CALLS = 3;
const TWO_REFRESHES = 2;
const FIRST_TRY_AND_RETRY = 2;

const GET: HttpRequest = { method: 'GET', path: '/tanks' };
const unauthorized = (): ApiError => new ApiError(STATUS.unauthorized, 'UNAUTHORIZED', 'x');

/** A refresher that installs NEW_TOKEN, like the real one after POST /auth/refresh. */
function refresherFor(tokens: TokenStore, outcome: 'ok' | Error = 'ok') {
  const refresh = vi.fn(() => {
    if (outcome !== 'ok') {
      return Promise.reject(outcome);
    }
    tokens.set(NEW_TOKEN, FAR_FUTURE);
    return Promise.resolve();
  });
  const refresher: SessionRefresher = { refresh };
  return { refresher, refresh };
}

function authorizationOf(request: HttpRequest | undefined): string | undefined {
  return request?.headers?.Authorization;
}

function withToken(token: string | null) {
  const tokens = new TokenStore();
  if (token !== null) {
    tokens.set(token, FAR_FUTURE);
  }
  return tokens;
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error: unknown) => error,
  );
}

describe('AuthHttpClient bearer token', () => {
  it('adds the in-memory token to the request', async () => {
    const fake = new FakeHttpClient(okResponse({}));
    const tokens = withToken(OLD_TOKEN);
    const client = new AuthHttpClient(fake, tokens, refresherFor(tokens).refresher);

    await client.request(GET);

    expect(authorizationOf(fake.requests[0])).toBe(`Bearer ${OLD_TOKEN}`);
  });

  it('sends no Authorization header while nobody is signed in', async () => {
    const fake = new FakeHttpClient(okResponse({}));
    const tokens = withToken(null);
    const client = new AuthHttpClient(fake, tokens, refresherFor(tokens).refresher);

    await client.request(GET);

    expect(fake.requests[0]?.headers).toBeUndefined();
  });

  it.each(['/auth/login', '/auth/refresh', '/auth/reset-password', '/public/vereda/schedule'])(
    'never sends the token to %s',
    async (path) => {
      const fake = new FakeHttpClient(okResponse({}));
      const tokens = withToken(OLD_TOKEN);
      const client = new AuthHttpClient(fake, tokens, refresherFor(tokens).refresher);

      await client.request({ method: 'POST', path });

      expect(authorizationOf(fake.requests[0])).toBeUndefined();
    },
  );

  it('keeps the headers the caller set', async () => {
    const fake = new FakeHttpClient(okResponse({}));
    const tokens = withToken(OLD_TOKEN);
    const client = new AuthHttpClient(fake, tokens, refresherFor(tokens).refresher);

    await client.request({ ...GET, headers: { 'X-Custom': 'a' } });

    expect(fake.requests[0]?.headers).toEqual({
      'X-Custom': 'a',
      Authorization: `Bearer ${OLD_TOKEN}`,
    });
  });
});

describe('AuthHttpClient refresh after 401', () => {
  it('refreshes once and repeats the call with the new token', async () => {
    const fake = new FakeHttpClient(unauthorized(), okResponse({ ok: true }));
    const tokens = withToken(OLD_TOKEN);
    const { refresher, refresh } = refresherFor(tokens);
    const client = new AuthHttpClient(fake, tokens, refresher);

    const response = await client.request<{ ok: boolean }>(GET);

    expect(response.body).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fake.requests.map(authorizationOf)).toEqual([
      `Bearer ${OLD_TOKEN}`,
      `Bearer ${NEW_TOKEN}`,
    ]);
  });

  it('lets the second 401 go up without a second refresh', async () => {
    const second = unauthorized();
    const fake = new FakeHttpClient(unauthorized(), second);
    const tokens = withToken(OLD_TOKEN);
    const { refresher, refresh } = refresherFor(tokens);
    const client = new AuthHttpClient(fake, tokens, refresher);

    expect(await failureOf(client.request(GET))).toBe(second);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fake.requests).toHaveLength(FIRST_TRY_AND_RETRY);
  });

  it('makes parallel failing calls share one refresh', async () => {
    const calls: (() => Promise<HttpResponse<unknown>>)[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tokens = withToken(OLD_TOKEN);
    const inner: HttpClient = {
      request: <T>(request: HttpRequest) => {
        if (authorizationOf(request) === `Bearer ${OLD_TOKEN}`) {
          return gate.then(() => Promise.reject(unauthorized()));
        }
        return Promise.resolve(okResponse({}) as HttpResponse<T>);
      },
    };
    const refresh = vi.fn(() => {
      tokens.set(NEW_TOKEN, FAR_FUTURE);
      return Promise.resolve();
    });
    const client = new AuthHttpClient(inner, tokens, { refresh });
    for (let index = 0; index < PARALLEL_CALLS; index += 1) {
      calls.push(() => client.request(GET));
    }

    const pending = calls.map((call) => call());
    release();
    await Promise.all(pending);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('skips the refresh when another call already renewed the token', async () => {
    const tokens = withToken(OLD_TOKEN);
    const { refresher, refresh } = refresherFor(tokens);
    const fake = new FakeHttpClient(okResponse({}));
    const inner: HttpClient = {
      request: <T>(request: HttpRequest) => {
        if (fake.requests.length === 0) {
          fake.requests.push(request);
          tokens.set(NEW_TOKEN, FAR_FUTURE); // the other call finished its refresh
          return Promise.reject(unauthorized());
        }
        return fake.request<T>(request);
      },
    };
    const client = new AuthHttpClient(inner, tokens, refresher);

    await client.request(GET);

    expect(refresh).not.toHaveBeenCalled();
    expect(authorizationOf(fake.requests[1])).toBe(`Bearer ${NEW_TOKEN}`);
  });

  it('raises the original 401 when the refresh is rejected', async () => {
    const original = unauthorized();
    const fake = new FakeHttpClient(original);
    const tokens = withToken(OLD_TOKEN);
    const rejection = new ApiError(STATUS.unauthorized, 'SESSION_REVOKED', 'x');
    const client = new AuthHttpClient(fake, tokens, refresherFor(tokens, rejection).refresher);

    expect(await failureOf(client.request(GET))).toBe(original);
    expect(fake.requests).toHaveLength(1);
  });

  it('raises the network error when the refresh cannot reach the server', async () => {
    const offline = new NetworkError();
    const tokens = withToken(OLD_TOKEN);
    const client = new AuthHttpClient(
      new FakeHttpClient(unauthorized()),
      tokens,
      refresherFor(tokens, offline).refresher,
    );

    expect(await failureOf(client.request(GET))).toBe(offline);
  });

  it('can refresh again for a later call after the first refresh finished', async () => {
    const fake = new FakeHttpClient(unauthorized(), okResponse({}), unauthorized(), okResponse({}));
    const tokens = withToken(OLD_TOKEN);
    const { refresher, refresh } = refresherFor(tokens);
    const client = new AuthHttpClient(fake, tokens, refresher);

    await client.request(GET);
    tokens.set(OLD_TOKEN, FAR_FUTURE); // the token expires again later
    await client.request(GET);

    expect(refresh).toHaveBeenCalledTimes(TWO_REFRESHES);
  });

  it.each([
    ['a 403', new ApiError(STATUS.forbidden, 'FORBIDDEN', 'x')],
    ['a 500', new ApiError(STATUS.serviceUnavailable, 'INTERNAL_ERROR', 'x')],
    ['a network error', new NetworkError()],
  ])('does not refresh after %s', async (_name, error) => {
    const tokens = withToken(OLD_TOKEN);
    const { refresher, refresh } = refresherFor(tokens);
    const client = new AuthHttpClient(new FakeHttpClient(error), tokens, refresher);

    expect(await failureOf(client.request(GET))).toBe(error);
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each(['/auth/login', '/auth/refresh'])(
    'does not refresh after a 401 from %s',
    async (path) => {
      const error = new ApiError(STATUS.unauthorized, 'INVALID_CREDENTIALS', 'x');
      const tokens = withToken(null);
      const { refresher, refresh } = refresherFor(tokens);
      const client = new AuthHttpClient(new FakeHttpClient(error), tokens, refresher);

      expect(await failureOf(client.request({ method: 'POST', path }))).toBe(error);
      expect(refresh).not.toHaveBeenCalled();
    },
  );
});

describe('TokenStore', () => {
  it('holds the token in private fields so it is not serialized', () => {
    const tokens = withToken(OLD_TOKEN);

    expect(JSON.stringify(tokens)).toBe('{}');
    expect(Object.keys(tokens)).toEqual([]);
    expect(tokens.get()).toBe(OLD_TOKEN);
    expect(tokens.expiresAtMs()).toBe(FAR_FUTURE);
  });

  it('forgets the token on clear', () => {
    const tokens = withToken(OLD_TOKEN);

    tokens.clear();

    expect(tokens.get()).toBeNull();
    expect(tokens.expiresAtMs()).toBeNull();
  });

  it('never writes to web storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    withToken(OLD_TOKEN).clear();

    expect(setItem).not.toHaveBeenCalled();
  });
});
