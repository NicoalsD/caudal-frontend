import { http, HttpResponse } from 'msw';

import { readAccessTokenClaims } from '../../../core/session/accessTokenClaims';
import type { components } from '../../../services/api/schema';
import { STATUS } from '../../constants';
import {
  buildLoginResponse,
  buildMeResponse,
  findTestUser,
  TEST_PASSWORD,
} from '../../factories/auth';
import { apiUrl } from '../apiUrl';
import { errorResponse } from '../errorResponse';

type LoginRequestDto = components['schemas']['LoginRequest'];

const BEARER_PREFIX = 'Bearer ';

export function bearerOf(request: Request): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith(BEARER_PREFIX) === true ? header.slice(BEARER_PREFIX.length) : null;
}

/**
 * Default session handlers, faithful to API.md section 2. They are stateless: login answers for
 * the fixture users, /auth/me reads the claims of the bearer token, refresh finds no cookie.
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
  http.get(apiUrl('/auth/me'), ({ request }) => {
    const token = bearerOf(request);
    const claims = token === null ? null : readAccessTokenClaims(token);
    const user =
      claims === null ? undefined : findTestUser((candidate) => candidate.id === claims.subject);
    return user === undefined
      ? errorResponse(STATUS.unauthorized, 'UNAUTHORIZED')
      : HttpResponse.json(buildMeResponse(user));
  }),
  http.post(apiUrl('/auth/refresh'), () => errorResponse(STATUS.unauthorized, 'UNAUTHORIZED')),
  http.post(apiUrl('/auth/logout'), () => new HttpResponse(null, { status: STATUS.noContent })),
];
