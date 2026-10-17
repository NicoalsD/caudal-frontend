import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { SectorView, TankView, ValveView } from '../views';

type SectorListDto = components['schemas']['SectorList'];
type TankListDto = components['schemas']['TankList'];
type ValveListDto = components['schemas']['ValveList'];

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

  /** GET /tanks (any signed-in role). */
  async tanks(): Promise<TankView[]> {
    const response = await this.http.request<TankListDto>({ method: 'GET', path: '/tanks' });
    return response.body.items.map((item) => this.adapter.toTank(item));
  }

  /** GET /sectors/{id}/valves (any signed-in role). */
  async valves(sectorId: string): Promise<ValveView[]> {
    const response = await this.http.request<ValveListDto>({
      method: 'GET',
      path: `/sectors/${encodeURIComponent(sectorId)}/valves`,
    });
    return response.body.items.map((item) => this.adapter.toValve(item));
  }
}
