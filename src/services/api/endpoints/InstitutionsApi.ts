import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { PublicInstitutionView } from '../views';

type DirectoryDto = components['schemas']['PublicInstitutionDirectory'];

/** The public directory of institutions for the first step of the sign in (API.md section 2.1). */
export class InstitutionsApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /api/v1/public/institutions (public, no session): active institutions as {slug, name}. */
  async list(): Promise<readonly PublicInstitutionView[]> {
    const response = await this.http.request<DirectoryDto>({
      method: 'GET',
      path: '/public/institutions',
    });
    return this.adapter.toInstitutionDirectory(response.body);
  }
}
