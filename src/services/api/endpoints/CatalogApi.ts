import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { CatalogOptionView } from '../views';

type CatalogListDto = components['schemas']['CatalogList'];

/** Catalogs that the screens read as options (API.md 4.2). */
export type CatalogName = 'WATER_APPEARANCE' | 'DAMAGE_CATEGORY';

/** Option lists of the API. Only labels: the codes are what the server stores. */
export class CatalogApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /catalogs/{catalog}: the active options, in the order the server sends them. */
  async options(catalog: CatalogName): Promise<CatalogOptionView[]> {
    const response = await this.http.request<CatalogListDto>({
      method: 'GET',
      path: `/catalogs/${encodeURIComponent(catalog)}`,
    });
    return response.body.items.map((item) => this.adapter.toCatalogOption(item));
  }
}
