import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { PrivacyAcceptanceView, PrivacyNoticeView } from '../views';

type PrivacyNoticeDto = components['schemas']['PrivacyNotice'];
type PrivacyAcceptanceDto = components['schemas']['PrivacyAcceptance'];
type AcceptPrivacyNoticeDto = components['schemas']['AcceptPrivacyNoticeRequest'];

/** The privacy notice (API.md section 4.3 and 4.4). Any signed-in person may call it. */
export class PrivacyApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /privacy-notice/current: the version in effect, with its text. */
  async current(): Promise<PrivacyNoticeView> {
    const response = await this.http.request<PrivacyNoticeDto>({
      method: 'GET',
      path: '/privacy-notice/current',
    });
    return this.adapter.toPrivacyNotice(response.body);
  }

  /**
   * POST /privacy-notice/accept (201). The version must be the one in effect: otherwise the server
   * answers 409 CONFLICT with `details.current_version`.
   */
  async accept(version: number): Promise<PrivacyAcceptanceView> {
    const body: AcceptPrivacyNoticeDto = { version };
    const response = await this.http.request<PrivacyAcceptanceDto>({
      method: 'POST',
      path: '/privacy-notice/accept',
      body,
    });
    return this.adapter.toPrivacyAcceptance(response.body);
  }
}
