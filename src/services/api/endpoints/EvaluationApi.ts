import type { HttpClient } from '../../http/HttpClient';
import { toForecastEvaluation } from '../adapters/EvaluationAdapter';
import type { components } from '../schema';
import type { ForecastEvaluationView } from '../views';

type ForecastEvaluationDto = components['schemas']['ForecastEvaluation'];

/** Filters of GET /forecast-evaluation. Dates are calendar days (YYYY-MM-DD) in America/Bogota. */
export interface ForecastEvaluationFilter {
  readonly horizonDays: number;
  readonly from?: string;
  readonly to?: string;
}

/** Whether the AI helps against the simple estimate (API.md section 14). */
export class EvaluationApi {
  constructor(private readonly http: HttpClient) {}

  /** GET /forecast-evaluation for one horizon. Without dates the server uses the last 90 days. */
  async get(filter: ForecastEvaluationFilter): Promise<ForecastEvaluationView> {
    const query: Record<string, string> = { horizon_days: String(filter.horizonDays) };
    if (filter.from !== undefined && filter.from !== '') {
      query.from = filter.from;
    }
    if (filter.to !== undefined && filter.to !== '') {
      query.to = filter.to;
    }
    const response = await this.http.request<ForecastEvaluationDto>({
      method: 'GET',
      path: '/forecast-evaluation',
      query,
    });
    return toForecastEvaluation(response.body);
  }
}
