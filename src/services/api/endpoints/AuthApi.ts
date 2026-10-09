import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { LoginView, MeView, RefreshView } from '../views';

type LoginRequestDto = components['schemas']['LoginRequest'];
type LoginDto = components['schemas']['LoginResponse'];
type RefreshDto = components['schemas']['RefreshResponse'];
type MeDto = components['schemas']['MeResponse'];

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

  /**
   * POST /api/v1/auth/refresh. No body: the browser sends the HttpOnly cookie (credentials are
   * included for /auth/ paths) and the rotated cookie comes back as Set-Cookie.
   */
  async refresh(): Promise<RefreshView> {
    const response = await this.http.request<RefreshDto>({ method: 'POST', path: '/auth/refresh' });
    return this.adapter.toRefresh(response.body);
  }

  /** GET /api/v1/auth/me: allowed even while the password change is pending. */
  async me(): Promise<MeView> {
    const response = await this.http.request<MeDto>({ method: 'GET', path: '/auth/me' });
    return this.adapter.toMe(response.body);
  }

  /** POST /api/v1/auth/logout (204): the server revokes the refresh family and clears the cookie. */
  async logout(): Promise<void> {
    await this.http.request<undefined>({ method: 'POST', path: '/auth/logout' });
  }
}
