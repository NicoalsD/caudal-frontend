import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toAnomaly, toAnomalyPage } from '../adapters/AnomalyAdapter';
import type { AnomalyDto, AnomalyPageDto } from '../adapters/AnomalyAdapter';
import type { AnomalyPageView, AnomalyStatus, AnomalyView } from '../views';

/** The resolutions the Board can choose (API.md 9.2). */
export type AnomalyResolution = Extract<AnomalyStatus, 'CONFIRMED' | 'DISMISSED'>;

/** Anomalies of the aqueduct (API.md section 9). */
export class AnomaliesApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /anomalies with the given status, most recent first. */
  async list(status: AnomalyStatus): Promise<AnomalyPageView> {
    const response = await this.http.request<AnomalyPageDto>({
      method: 'GET',
      path: '/anomalies',
      query: { status },
    });
    return toAnomalyPage(this.adapter, response.body);
  }

  /** PATCH /anomalies/{id}. The note is sent only when there is one (required to dismiss). */
  async resolve(id: string, status: AnomalyResolution, note?: string): Promise<AnomalyView> {
    const response = await this.http.request<AnomalyDto>({
      method: 'PATCH',
      path: `/anomalies/${encodeURIComponent(id)}`,
      body: { status, ...(note === undefined ? {} : { resolution_note: note }) },
    });
    return toAnomaly(this.adapter, response.body);
  }
}
