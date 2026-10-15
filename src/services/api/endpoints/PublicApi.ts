import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { PublicScheduleView } from '../views';

type PublicScheduleDto = components['schemas']['PublicSchedule'];

/** The public pages (API.md section 15). No session: nothing here carries a token. */
export class PublicApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /public/{slug}/schedule: today's published schedule when no date is given. */
  async schedule(aqueductSlug: string, date?: string): Promise<PublicScheduleView> {
    const response = await this.http.request<PublicScheduleDto>({
      method: 'GET',
      path: `/public/${encodeURIComponent(aqueductSlug)}/schedule`,
      ...(date === undefined ? {} : { query: { date } }),
    });
    return this.adapter.toPublicSchedule(response.body);
  }

  /** GET /public/{slug}/schedule/whatsapp-text: the day's schedule as plain text (text/plain). */
  async whatsappText(aqueductSlug: string): Promise<string> {
    const response = await this.http.request<string>({
      method: 'GET',
      path: `/public/${encodeURIComponent(aqueductSlug)}/schedule/whatsapp-text`,
      responseType: 'text',
    });
    return response.body;
  }
}
