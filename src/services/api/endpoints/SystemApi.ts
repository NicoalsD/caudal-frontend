import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { HealthView } from '../views';

type HealthDto = components['schemas']['HealthResponse'];

/** Service status endpoints, outside the /api/v1 prefix. */
export class SystemApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /actuator/health (public, minimal). Resolves to isUp=false when the service reports DOWN. */
  async health(): Promise<HealthView> {
    const response = await this.http.request<HealthDto>({
      method: 'GET',
      path: '/actuator/health',
      scope: 'root',
    });
    return this.adapter.toHealth(response.body);
  }
}
