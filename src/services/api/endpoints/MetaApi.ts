import type { ConstraintsMap } from '../../../core/forms/FieldConstraint';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toCatalogItem } from '../adapters/ReadingsAdapter';
import type { CatalogDto } from '../adapters/ReadingsAdapter';
import type { components } from '../schema';
import type { CatalogItemView } from '../views';

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

  /** GET /api/v1/catalogs/{catalog} (public): the active options, in the order of the server. */
  async catalog(name: 'WATER_APPEARANCE' | 'DAMAGE_CATEGORY'): Promise<CatalogItemView[]> {
    const response = await this.http.request<CatalogDto>({
      method: 'GET',
      path: `/catalogs/${name}`,
    });
    return response.body.items
      .map((item) => toCatalogItem(item))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
