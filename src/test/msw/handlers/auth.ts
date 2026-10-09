import { http, HttpResponse } from 'msw';

import type { components } from '../../../services/api/schema';
import { STATUS } from '../../constants';
import { buildLoginResponse, TEST_PASSWORD, TEST_USERS } from '../../factories/auth';
import type { AuthUserDto } from '../../factories/auth';
import { apiUrl } from '../apiUrl';
import { errorResponse } from '../errorResponse';

type LoginRequestDto = components['schemas']['LoginRequest'];

function findUser(username: string): AuthUserDto | undefined {
  return Object.values<AuthUserDto>(TEST_USERS).find((user) => user.username === username);
}

/** Login faithful to API.md 2.1: one generic 401 for a wrong user or a wrong password. */
export const authHandlers = [
  http.post(apiUrl('/auth/login'), async ({ request }) => {
    const body = (await request.json()) as LoginRequestDto;
    const user = findUser(body.username);
    if (user === undefined || body.password !== TEST_PASSWORD) {
      return errorResponse(STATUS.unauthorized, 'INVALID_CREDENTIALS', {
        message: 'Usuario o contraseña incorrectos.',
      });
    }
    return HttpResponse.json(buildLoginResponse(user));
  }),
];
