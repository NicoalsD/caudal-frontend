import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { SectorView, TankView, ValveView } from '../views';

type SectorListDto = components['schemas']['SectorList'];
type TankListDto = components['schemas']['TankList'];
type ValveListDto = components['schemas']['ValveList'];
type SectorDto = components['schemas']['Sector'];
type ValveDto = components['schemas']['Valve'];
type CreateSectorDto = components['schemas']['CreateSectorRequest'];
type UpdateSectorDto = components['schemas']['UpdateSectorRequest'];
type CreateValveDto = components['schemas']['CreateValveRequest'];

export interface CreateSectorInput {
  readonly code: string;
  readonly name: string;
  /** Without a parent the sector is a region. */
  readonly parentSectorId?: string | null;
  readonly householdsCount?: number;
}

/** What may change in a sector (API.md 5.5). `parentSectorId` and `isRegion` never go together. */
export interface UpdateSectorInput {
  readonly name?: string;
  readonly parentSectorId?: string;
  readonly isRegion?: true;
  readonly isActive?: boolean;
}

export interface CreateValveInput {
  readonly code: string;
  readonly name: string;
  readonly isMotorized: boolean;
}

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

  /** POST /sectors (NETWORK_MANAGE): a sector, or a region when it has no parent. */
  async createSector(input: CreateSectorInput): Promise<SectorView> {
    const body: CreateSectorDto = {
      code: input.code,
      name: input.name,
      ...(input.parentSectorId === undefined || input.parentSectorId === null
        ? {}
        : { parent_sector_id: input.parentSectorId }),
      ...(input.householdsCount === undefined ? {} : { households_count: input.householdsCount }),
    };
    const response = await this.http.request<SectorDto>({ method: 'POST', path: '/sectors', body });
    return this.adapter.toSector(response.body);
  }

  /** PATCH /sectors/{id} (NETWORK_MANAGE): rename it, move it under another sector, or make it a region. */
  async updateSector(id: string, input: UpdateSectorInput): Promise<SectorView> {
    const body: UpdateSectorDto = {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.parentSectorId === undefined ? {} : { parent_sector_id: input.parentSectorId }),
      ...(input.isRegion === undefined ? {} : { is_region: input.isRegion }),
      ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
    };
    const response = await this.http.request<SectorDto>({
      method: 'PATCH',
      path: `/sectors/${encodeURIComponent(id)}`,
      body,
    });
    return this.adapter.toSector(response.body);
  }

  /** POST /sectors/{id}/valves (NETWORK_MANAGE): assigns a new valve to the sector. */
  async createValve(sectorId: string, input: CreateValveInput): Promise<ValveView> {
    const body: CreateValveDto = {
      code: input.code,
      name: input.name,
      is_motorized: input.isMotorized,
    };
    const response = await this.http.request<ValveDto>({
      method: 'POST',
      path: `/sectors/${encodeURIComponent(sectorId)}/valves`,
      body,
    });
    return this.adapter.toValve(response.body);
  }
}
