import type { ModifiedShift } from '../../../core/proposal/ProposalEditorMediator';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type {
  ScheduleProposalPageView,
  ScheduleProposalSummaryView,
  ScheduleProposalView,
  SchedulePublicationView,
} from '../views';

type ProposalPageDto = components['schemas']['ScheduleProposalPage'];
type ProposalSummaryDto = components['schemas']['ScheduleProposalSummary'];
type GenerateDto = components['schemas']['GenerateScheduleProposalRequest'];
type ProposalDto = components['schemas']['ScheduleProposal'];
type DecideDto = components['schemas']['DecideScheduleProposalRequest'];
type RejectDto = components['schemas']['RejectScheduleProposalRequest'];
type ModifyDto = components['schemas']['ModifyScheduleProposalRequest'];
type PublicationDto = components['schemas']['SchedulePublication'];

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

  /** GET /schedule-proposals/{id}: the shifts, their reasons and the Board's history. */
  async get(id: string): Promise<ScheduleProposalView> {
    const response = await this.http.request<ProposalDto>({
      method: 'GET',
      path: `/schedule-proposals/${encodeURIComponent(id)}`,
    });
    return this.adapter.toProposal(response.body);
  }

  /** POST /schedule-proposals/{id}/approve (lock_version from the proposal the Board read). */
  async approve(id: string, lockVersion: number): Promise<ScheduleProposalView> {
    const body: DecideDto = { lock_version: lockVersion };
    const response = await this.http.request<ProposalDto>({
      method: 'POST',
      path: `/schedule-proposals/${encodeURIComponent(id)}/approve`,
      body,
    });
    return this.adapter.toProposal(response.body);
  }

  /** POST /schedule-proposals/{id}/modify: the shifts that remain, with the reason of the change. */
  async modify(
    id: string,
    lockVersion: number,
    reason: string,
    items: readonly ModifiedShift[],
  ): Promise<ScheduleProposalView> {
    const body: ModifyDto = {
      lock_version: lockVersion,
      reason,
      items: items.map((item) => ({
        id: item.id,
        sector_id: item.sectorId,
        start_at: item.startAt,
        end_at: item.endAt,
        sequence: item.sequence,
      })),
    };
    const response = await this.http.request<ProposalDto>({
      method: 'POST',
      path: `/schedule-proposals/${encodeURIComponent(id)}/modify`,
      body,
    });
    return this.adapter.toProposal(response.body);
  }

  /** POST /schedule-proposals/{id}/reject: a final state, with the reason. */
  async reject(id: string, lockVersion: number, reason: string): Promise<ScheduleProposalView> {
    const body: RejectDto = { lock_version: lockVersion, reason };
    const response = await this.http.request<ProposalDto>({
      method: 'POST',
      path: `/schedule-proposals/${encodeURIComponent(id)}/reject`,
      body,
    });
    return this.adapter.toProposal(response.body);
  }

  /** POST /schedule-proposals/{id}/publish: the approved schedule goes public (no personal data). */
  async publish(id: string, lockVersion: number): Promise<SchedulePublicationView> {
    const body: DecideDto = { lock_version: lockVersion };
    const response = await this.http.request<PublicationDto>({
      method: 'POST',
      path: `/schedule-proposals/${encodeURIComponent(id)}/publish`,
      body,
    });
    return this.adapter.toPublication(response.body);
  }
}
