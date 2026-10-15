import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { ScheduleProposalPageView, ScheduleProposalSummaryView } from '../views';

type ProposalPageDto = components['schemas']['ScheduleProposalPage'];
type ProposalSummaryDto = components['schemas']['ScheduleProposalSummary'];
type GenerateDto = components['schemas']['GenerateScheduleProposalRequest'];

/** Filters of GET /schedule-proposals (API.md 10.2). Dates are YYYY-MM-DD. */
export interface ProposalListFilter {
  readonly serviceDateFrom?: string;
  readonly serviceDateTo?: string;
  /** Cursor of the next page (API.md 1.5); absent for the first one. */
  readonly cursor?: string;
}

/** Schedule proposals of the Board (API.md section 10). */
export class ProposalsApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /schedule-proposals, one page. */
  async list(filter: ProposalListFilter = {}): Promise<ScheduleProposalPageView> {
    const query: Record<string, string> = {};
    if (filter.serviceDateFrom !== undefined) {
      query.service_date_from = filter.serviceDateFrom;
    }
    if (filter.serviceDateTo !== undefined) {
      query.service_date_to = filter.serviceDateTo;
    }
    if (filter.cursor !== undefined) {
      query.cursor = filter.cursor;
    }
    const response = await this.http.request<ProposalPageDto>({
      method: 'GET',
      path: '/schedule-proposals',
      query,
    });
    return this.adapter.toProposalPage(response.body);
  }

  /** POST /schedule-proposals: generates the proposal of the day (PENDING_REVIEW). */
  async generate(serviceDate: string): Promise<ScheduleProposalSummaryView> {
    const body: GenerateDto = { service_date: serviceDate };
    const response = await this.http.request<ProposalSummaryDto>({
      method: 'POST',
      path: '/schedule-proposals',
      body,
    });
    return this.adapter.toProposalSummary(response.body);
  }
}
