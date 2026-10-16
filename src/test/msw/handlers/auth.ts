import { http, HttpResponse } from 'msw';

import { readAccessTokenClaims } from '../../../core/session/accessTokenClaims';
import type { components } from '../../../services/api/schema';
import { STATUS } from '../../constants';
import {
  buildLoginResponse,
  buildCurrentUserResponse,
  findTestUser,
  TEST_PASSWORD,
} from '../../factories/auth';
import { apiUrl } from '../apiUrl';
import { errorResponse } from '../errorResponse';

type LoginRequestDto = components['schemas']['LoginRequest'];
type ChangePasswordDto = components['schemas']['ChangePasswordRequest'];

/** A password the fake server treats as "too common" (API.md 2.5). */
export const COMMON_PASSWORD = 'contrasena-comun-12345';

const BEARER_PREFIX = 'Bearer ';
const MIN_NEW_PASSWORD = 12;

export function bearerOf(request: Request): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith(BEARER_PREFIX) === true ? header.slice(BEARER_PREFIX.length) : null;
}

/** Change-password rules of API.md 2.5 that the fake server can check. */
export function changePasswordOutcome(
  user: { readonly username: string },
  body: ChangePasswordDto,
  currentPassword: string = TEST_PASSWORD,
): Response | null {
  if (body.current_password !== currentPassword) {
    return errorResponse(STATUS.unauthorized, 'UNAUTHORIZED');
  }
  const next = body.new_password;
  if (
    next.length < MIN_NEW_PASSWORD ||
    next === COMMON_PASSWORD ||
    next.toLowerCase().includes(user.username)
  ) {
    return errorResponse(STATUS.unprocessable, 'PASSWORD_POLICY_VIOLATION');
  }
  return null;
}

/**
 * Default session handlers, faithful to API.md section 2. They are stateless: login answers for
 * the fixture users, /auth/current-user reads the claims of the bearer token, refresh finds no cookie.
 * Tests that need a cookie jar use createSessionBackend.
 */
export const authHandlers = [
  http.post(apiUrl('/auth/login'), async ({ request }) => {
    const body = (await request.json()) as LoginRequestDto;
    const user = findTestUser((candidate) => candidate.username === body.username);
    if (user === undefined || body.password !== TEST_PASSWORD) {
      return errorResponse(STATUS.unauthorized, 'INVALID_CREDENTIALS', {
        message: 'Usuario o contraseña incorrectos.',
      });
    }
    return HttpResponse.json(buildLoginResponse(user));
  }),
  http.get(apiUrl('/auth/current-user'), ({ request }) => {
    const token = bearerOf(request);
    const claims = token === null ? null : readAccessTokenClaims(token);
    const user =
      claims === null ? undefined : findTestUser((candidate) => candidate.id === claims.subject);
    return user === undefined
      ? errorResponse(STATUS.unauthorized, 'UNAUTHORIZED')
      : HttpResponse.json(buildCurrentUserResponse(user));
  }),
  http.post(apiUrl('/auth/change-password'), async ({ request }) => {
    const token = bearerOf(request);
    const claims = token === null ? null : readAccessTokenClaims(token);
    const user =
      claims === null ? undefined : findTestUser((candidate) => candidate.id === claims.subject);
    if (user === undefined) {
      return errorResponse(STATUS.unauthorized, 'UNAUTHORIZED');
    }
    const failure = changePasswordOutcome(user, (await request.json()) as ChangePasswordDto);
    return failure ?? new HttpResponse(null, { status: STATUS.noContent });
  }),
  http.post(apiUrl('/auth/refresh'), () => errorResponse(STATUS.unauthorized, 'UNAUTHORIZED')),
  http.post(apiUrl('/auth/logout'), () => new HttpResponse(null, { status: STATUS.noContent })),
];
