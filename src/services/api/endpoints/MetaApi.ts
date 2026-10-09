import type { ConstraintsMap } from '../../../core/forms/FieldConstraint';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';

type ConstraintsDto = components['schemas']['ConstraintsResponse'];

/** Reference data the forms depend on. */
export class MetaApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /api/v1/meta/constraints (public): the FieldLimits of the backend, per field. */
  async getConstraints(): Promise<ConstraintsMap> {
    const response = await this.http.request<ConstraintsDto>({
      method: 'GET',
      path: '/meta/constraints',
    });
    return this.adapter.toConstraints(response.body);
  }
}
