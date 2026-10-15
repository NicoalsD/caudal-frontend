import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toMinutes, toMinutesSummary } from '../adapters/MinutesAdapter';
import type { components } from '../schema';
import type { MinutesPageView, MinutesView } from '../views';

type MinutesPageDto = components['schemas']['MinutesPage'];
type MinutesDto = components['schemas']['Minutes'];

/** The Board's actas (API.md section 13). */
export class MinutesApi {
  /** `apiBaseUrl` is the absolute API base (with /api/v1): the PDF link is built from it. */
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
    private readonly apiBaseUrl: string,
  ) {}

  /** GET /minutes: one page, newest first. Pass the previous `nextCursor` for the next one. */
  async list(cursor?: string): Promise<MinutesPageView> {
    const response = await this.http.request<MinutesPageDto>({
      method: 'GET',
      path: '/minutes',
      ...(cursor === undefined ? {} : { query: { cursor } }),
    });
    return {
      items: response.body.items.map((item) => toMinutesSummary(this.adapter, item)),
      nextCursor: response.body.next_cursor ?? null,
    };
  }

  /** POST /minutes: a draft for the period, with its four sections (API.md 13.1). */
  async generate(periodFrom: string, periodTo: string): Promise<MinutesView> {
    const response = await this.http.request<MinutesDto>({
      method: 'POST',
      path: '/minutes',
      body: { period_from: periodFrom, period_to: periodTo },
    });
    return toMinutes(this.adapter, response.body);
  }

  /** GET /minutes/{id} (API.md 13.2). */
  async get(id: string): Promise<MinutesView> {
    const response = await this.http.request<MinutesDto>({
      method: 'GET',
      path: `/minutes/${encodeURIComponent(id)}`,
    });
    return toMinutes(this.adapter, response.body);
  }

  /** POST /minutes/{id}/finalize: the draft becomes final, with its PDF hash (API.md 13.7). */
  async finalize(id: string): Promise<MinutesView> {
    const response = await this.http.request<MinutesDto>({
      method: 'POST',
      path: `/minutes/${encodeURIComponent(id)}/finalize`,
    });
    return toMinutes(this.adapter, response.body);
  }

  /**
   * URL of the acta PDF (API.md 13.3). A link, not a request: the browser downloads it. The
   * endpoint needs the access token, which a plain link does not send (see the report).
   */
  pdfUrl(id: string): string {
    return `${this.apiBaseUrl}/minutes/${encodeURIComponent(id)}/pdf`;
  }
}
