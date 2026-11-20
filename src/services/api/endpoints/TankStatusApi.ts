import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toForecast, toTankStatus } from '../adapters/StatusAdapter';
import type { ForecastDto, TankStatusDto } from '../adapters/StatusAdapter';
import type { ForecastView, TankStatusView } from '../views';

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

  /** GET /tanks/{id}/forecasts/latest: the last forecast run with its daily p10, p50 and p90. */
  async latestForecast(tankId: string): Promise<ForecastView> {
    const response = await this.http.request<ForecastDto>({
      method: 'GET',
      path: `/tanks/${encodeURIComponent(tankId)}/forecasts/latest`,
    });
    return toForecast(this.adapter, response.body);
  }

  /**
   * POST /tanks/{id}/forecasts: asks the AI for a new run now. Without a body the horizon is the
   * one of the rule in force. When the AI does not answer, the run is the simple estimate.
   */
  async runForecast(tankId: string): Promise<ForecastView> {
    const response = await this.http.request<ForecastDto>({
      method: 'POST',
      path: `/tanks/${encodeURIComponent(tankId)}/forecasts`,
      body: {},
    });
    return toForecast(this.adapter, response.body);
  }
}
