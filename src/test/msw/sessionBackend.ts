import { http, HttpResponse } from 'msw';
import type { HttpHandler } from 'msw';

import { STATUS } from '../constants';
import {
  buildLoginResponse,
  buildMeResponse,
  findTestUser,
  makeAccessToken,
  TEST_PASSWORD,
  ACCESS_TOKEN_SECONDS,
} from '../factories/auth';
import type { AuthUserDto } from '../factories/auth';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';
import { bearerOf, changePasswordOutcome } from './handlers/auth';
import type { components } from '../../services/api/schema';

type ChangePasswordDto = components['schemas']['ChangePasswordRequest'];

/** The header the real API demands on /auth/refresh (API.md section 1.2). */
const REQUIRED_REQUESTED_WITH = 'caudal-web';

export interface SessionBackend {
  readonly handlers: HttpHandler[];
  readonly calls: {
    refresh: number;
    login: number;
    logout: number;
    me: number;
    passwordChanges: number;
  };
  /** Every access token issued so far stops working (the 15 minutes passed). */
  expireAccessTokens(): void;
  /** The refresh cookie is gone or revoked: the next refresh answers 401. */
  dropCookie(): void;
  /** The browser holds a refresh cookie for this person (as after an earlier login). */
  setCookie(user: AuthUserDto): void;
  /** Make the next refresh fail like a lost connection. */
  failNextRefreshWithNetworkError(): void;
}

/**
 * A small in-memory server for the session endpoints. It keeps the cookie jar that MSW in Node
 * does not have: login and refresh "set" the cookie, logout and revocation remove it, and an
 * access token only works until expireAccessTokens() is called. State lives in this closure, so
 * each test gets its own.
 */
export function createSessionBackend(initialCookieUser: AuthUserDto | null = null): SessionBackend {
  let cookieUser = initialCookieUser;
  let serial = 0;
  let networkFailure = false;
  const validTokens = new Set<string>();
  const calls = { refresh: 0, login: 0, logout: 0, me: 0, passwordChanges: 0 };

  const issue = (user: AuthUserDto): string => {
    serial += 1;
    const token = makeAccessToken(user, serial);
    validTokens.add(token);
    return token;
  };

  const handlers = [
    http.post(apiUrl('/auth/login'), async ({ request }) => {
      calls.login += 1;
      const body = (await request.json()) as { username: string; password: string };
      const user = findTestUser((candidate) => candidate.username === body.username);
      if (user === undefined || body.password !== TEST_PASSWORD) {
        return errorResponse(STATUS.unauthorized, 'INVALID_CREDENTIALS');
      }
      cookieUser = user; // Set-Cookie: caudal_rt
      const token = issue(user);
      return HttpResponse.json({ ...buildLoginResponse(user, serial), access_token: token });
    }),
    http.post(apiUrl('/auth/refresh'), ({ request }) => {
      calls.refresh += 1;
      if (networkFailure) {
        networkFailure = false;
        return HttpResponse.error();
      }
      if (request.headers.get('X-Requested-With') !== REQUIRED_REQUESTED_WITH) {
        return errorResponse(STATUS.forbidden, 'FORBIDDEN');
      }
      if (cookieUser === null) {
        return errorResponse(STATUS.unauthorized, 'UNAUTHORIZED');
      }
      return HttpResponse.json({
        access_token: issue(cookieUser),
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_SECONDS,
      });
    }),
    http.get(apiUrl('/auth/me'), ({ request }) => {
      calls.me += 1;
      const token = bearerOf(request);
      if (token === null || !validTokens.has(token) || cookieUser === null) {
        return errorResponse(STATUS.unauthorized, 'UNAUTHORIZED');
      }
      return HttpResponse.json(buildMeResponse(cookieUser));
    }),
    http.post(apiUrl('/auth/change-password'), async ({ request }) => {
      const token = bearerOf(request);
      if (token === null || !validTokens.has(token) || cookieUser === null) {
        return errorResponse(STATUS.unauthorized, 'UNAUTHORIZED');
      }
      const failure = changePasswordOutcome(
        cookieUser,
        (await request.json()) as ChangePasswordDto,
      );
      if (failure !== null) {
        return failure;
      }
      cookieUser = null; // token_version bumped: refresh tokens revoked, access tokens dead
      validTokens.clear();
      calls.passwordChanges += 1;
      return new HttpResponse(null, { status: STATUS.noContent });
    }),
    http.post(apiUrl('/auth/logout'), () => {
      calls.logout += 1;
      cookieUser = null;
      validTokens.clear();
      return new HttpResponse(null, { status: STATUS.noContent });
    }),
  ];

  return {
    handlers,
    calls,
    expireAccessTokens: () => {
      validTokens.clear();
    },
    dropCookie: () => {
      cookieUser = null;
    },
    setCookie: (user) => {
      cookieUser = user;
    },
    failNextRefreshWithNetworkError: () => {
      networkFailure = true;
    },
  };
}
