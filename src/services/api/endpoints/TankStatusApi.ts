import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toTankStatus } from '../adapters/StatusAdapter';
import type { TankStatusDto } from '../adapters/StatusAdapter';
import type { TankStatusView } from '../views';

/** State and forecast of a tank (API.md section 8). */
export class TankStatusApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /tanks/{id}/status: last level, trend, staleness, band and the forecast of the day. */
  async get(tankId: string): Promise<TankStatusView> {
    const response = await this.http.request<TankStatusDto>({
      method: 'GET',
      path: `/tanks/${encodeURIComponent(tankId)}/status`,
    });
    return toTankStatus(this.adapter, response.body);
  }
}
