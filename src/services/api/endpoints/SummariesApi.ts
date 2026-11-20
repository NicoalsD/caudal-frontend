import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { SummaryPageView, SummaryScope, SummaryShareView } from '../views';

type SummaryPageDto = components['schemas']['SummaryPage'];
type SummaryShareDto = components['schemas']['SummaryShare'];
type CreateSummaryShareDto = components['schemas']['CreateSummaryShareRequest'];

/** Input of POST /summary-shares. Dates are YYYY-MM-DD; expiresAt is an ISO instant with offset. */
export interface CreateSummaryShareInput {
  readonly granteeUserId: string;
  readonly scope: SummaryScope;
  readonly periodFrom: string;
  readonly periodTo: string;
  readonly reason: string;
  readonly expiresAt: string;
}

/** Summaries the Board shares with entities (API.md 13.4 to 13.6). */
export class SummariesApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /summaries: the current authorizations (the Board) or the entity's own (SUPPORT_ENTITY). */
  async list(cursor?: string): Promise<SummaryPageView> {
    const response = await this.http.request<SummaryPageDto>({
      method: 'GET',
      path: '/summaries',
      ...(cursor === undefined ? {} : { query: { cursor } }),
    });
    return this.adapter.toSummaryPage(response.body);
  }

  /** POST /summary-shares (201). The server checks the reason, the period and the grantee's role. */
  async createShare(input: CreateSummaryShareInput): Promise<SummaryShareView> {
    const body: CreateSummaryShareDto = {
      grantee_user_id: input.granteeUserId,
      scope: input.scope,
      period_from: input.periodFrom,
      period_to: input.periodTo,
      reason: input.reason,
      expires_at: input.expiresAt,
    };
    const response = await this.http.request<SummaryShareDto>({
      method: 'POST',
      path: '/summary-shares',
      body,
    });
    return this.adapter.toSummaryShare(response.body);
  }

  /** DELETE /summary-shares/{id} (204): the entity stops seeing the summary at once. */
  async revokeShare(id: string): Promise<void> {
    await this.http.request<undefined>({
      method: 'DELETE',
      path: `/summary-shares/${encodeURIComponent(id)}`,
    });
  }
}
