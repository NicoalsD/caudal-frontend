import type { IncidentTarget } from '../../../core/incidents/incidentTransitions';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { IncidentInput, IncidentPageView, IncidentView } from '../views';

type IncidentPageDto = components['schemas']['IncidentPage'];
type IncidentDto = components['schemas']['Incident'];
type UpdateIncidentStatusDto = components['schemas']['UpdateIncidentStatusRequest'];
type CreateIncidentDto = components['schemas']['CreateIncidentRequest'];

/** Damage reports for the Board (API.md section 12). */
export class IncidentsApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /incidents: one page; pass the previous `nextCursor` to get the next one. */
  async list(cursor?: string): Promise<IncidentPageView> {
    const response = await this.http.request<IncidentPageDto>({
      method: 'GET',
      path: '/incidents',
      ...(cursor === undefined ? {} : { query: { cursor } }),
    });
    return this.adapter.toIncidentPage(response.body);
  }

  /**
   * POST /incidents (API.md 12.2): a damage registered by a signed-in person. Optional fields are
   * sent only when they have a value, as the server reads an absent field as "not known".
   */
  async create(input: IncidentInput): Promise<IncidentView> {
    const body: CreateIncidentDto = {
      category_code: input.categoryCode,
      description: input.description,
      ...(input.sectorId === null ? {} : { sector_id: input.sectorId }),
      ...(input.locationHint === null ? {} : { location_hint: input.locationHint }),
    };
    const response = await this.http.request<IncidentDto>({
      method: 'POST',
      path: '/incidents',
      body,
    });
    return this.adapter.toIncident(response.body);
  }

  /** PATCH /incidents/{id}/status. The note is sent only when there is one (required to dismiss). */
  async changeStatus(id: string, target: IncidentTarget, note?: string): Promise<IncidentView> {
    const body: UpdateIncidentStatusDto = {
      status: target,
      ...(note === undefined ? {} : { note }),
    };
    const response = await this.http.request<IncidentDto>({
      method: 'PATCH',
      path: `/incidents/${encodeURIComponent(id)}/status`,
      body,
    });
    return this.adapter.toIncident(response.body);
  }
}
