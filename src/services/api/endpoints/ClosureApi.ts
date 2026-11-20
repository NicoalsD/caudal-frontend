import { DomainError } from '../../../core/errors/DomainError';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toDayClosure } from '../adapters/ScheduleAdapter';
import type { components } from '../schema';
import type { DayClosureView } from '../views';

type DayClosureDto = components['schemas']['DayClosure'];

const NOT_FOUND_CODE = 'NOT_FOUND';

/** The closure of a service day (API.md section 11.2 and 11.3). */
export class ClosureApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /days/{date}/closure. A day without closure answers 404: that is null here, not an error. */
  async get(serviceDate: string): Promise<DayClosureView | null> {
    try {
      const response = await this.http.request<DayClosureDto>({
        method: 'GET',
        path: `/days/${encodeURIComponent(serviceDate)}/closure`,
      });
      return toDayClosure(this.adapter, response.body);
    } catch (error) {
      if (error instanceof DomainError && error.code === NOT_FOUND_CODE) {
        return null;
      }
      throw error;
    }
  }

  /** POST /days/{date}/closure. The note is always sent (it may be empty). */
  async close(serviceDate: string, notes: string): Promise<DayClosureView> {
    const response = await this.http.request<DayClosureDto>({
      method: 'POST',
      path: `/days/${encodeURIComponent(serviceDate)}/closure`,
      body: { notes },
    });
    return toDayClosure(this.adapter, response.body);
  }
}
