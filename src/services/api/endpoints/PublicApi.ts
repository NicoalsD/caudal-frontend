import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type {
  DamageReportInput,
  DamageReportReceiptView,
  PublicDamageReportView,
  PublicScheduleView,
} from '../views';

type PublicScheduleDto = components['schemas']['PublicSchedule'];
type CreateDamageReportDto = components['schemas']['CreateDamageReportRequest'];
type DamageReportCreatedDto = components['schemas']['DamageReportCreated'];
type PublicDamageReportDto = components['schemas']['PublicDamageReportStatus'];

/** The public pages (API.md section 15). No session: nothing here carries a token. */
export class PublicApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
    private readonly apiBaseUrl: string,
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

  /**
   * POST /public/{slug}/damage-reports (S05). The body is built field by field: the API rejects
   * unknown fields, and the location is sent only when the person wrote one.
   */
  async createDamageReport(
    aqueductSlug: string,
    input: DamageReportInput,
  ): Promise<DamageReportReceiptView> {
    const body: CreateDamageReportDto = {
      category_code: input.categoryCode,
      description: input.description,
      ...(input.locationHint === '' ? {} : { location_hint: input.locationHint }),
      website: input.website,
      form_started_at: input.formStartedAt,
    };
    const response = await this.http.request<DamageReportCreatedDto>({
      method: 'POST',
      path: `/public/${encodeURIComponent(aqueductSlug)}/damage-reports`,
      body,
    });
    return this.adapter.toDamageReportReceipt(response.body);
  }

  /** GET /public/damage-reports/{trackingCode} (S06): the status, with no personal data. */
  async damageReportStatus(trackingCode: string): Promise<PublicDamageReportView> {
    const response = await this.http.request<PublicDamageReportDto>({
      method: 'GET',
      path: `/public/damage-reports/${encodeURIComponent(trackingCode)}`,
    });
    return this.adapter.toPublicDamageReport(response.body);
  }

  /**
   * URL of the poster PDF (API.md 15.3). A link, not a request: the browser downloads it, and the
   * PDF is deterministic, so its SHA-256 matches the one stored by the backend.
   */
  posterPdfUrl(aqueductSlug: string): string {
    return `${this.apiBaseUrl}/public/${encodeURIComponent(aqueductSlug)}/schedule/poster.pdf`;
  }
}
