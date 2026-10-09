import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { SectorView } from '../views';

type SectorListDto = components['schemas']['SectorList'];

/** The physical network: tanks, sectors and valves (API.md section 5). */
export class NetworkApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /sectors (any signed-in role). */
  async sectors(): Promise<SectorView[]> {
    const response = await this.http.request<SectorListDto>({ method: 'GET', path: '/sectors' });
    return response.body.items.map((item) => this.adapter.toSector(item));
  }
}
