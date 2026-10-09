import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { LoginView } from '../views';

type LoginRequestDto = components['schemas']['LoginRequest'];
type LoginDto = components['schemas']['LoginResponse'];

export interface LoginInput {
  readonly username: string;
  readonly password: string;
}

/** Session endpoints (API.md section 2). */
export class AuthApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /**
   * POST /api/v1/auth/login (public). The body is built field by field: the API rejects unknown
   * fields. The refresh cookie arrives as Set-Cookie and the JavaScript never sees it.
   */
  async login(input: LoginInput): Promise<LoginView> {
    const body: LoginRequestDto = { username: input.username, password: input.password };
    const response = await this.http.request<LoginDto>({
      method: 'POST',
      path: '/auth/login',
      body,
    });
    return this.adapter.toLogin(response.body);
  }
}
