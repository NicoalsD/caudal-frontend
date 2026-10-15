import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import {
  toScheduleProposal,
  toScheduleProposalSummary,
  toShiftExecution,
} from '../adapters/ScheduleAdapter';
import type { components } from '../schema';
import type {
  ScheduleProposalSummaryView,
  ScheduleProposalView,
  ShiftExecutionInput,
  ShiftExecutionView,
} from '../views';

type ProposalPageDto = components['schemas']['ScheduleProposalPage'];
type ProposalDto = components['schemas']['ScheduleProposal'];
type ShiftExecutionDto = components['schemas']['ShiftExecution'];

/** Published shifts of a day and their executions (API.md sections 10 and 11). */
export class ScheduleApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /**
   * GET /schedule-proposals for one service day (API.md 10.2). Without `status`, the list has
   * every proposal of the day; the caller picks the one that is published or closed.
   */
  async listForDay(serviceDate: string): Promise<ScheduleProposalSummaryView[]> {
    const response = await this.http.request<ProposalPageDto>({
      method: 'GET',
      path: '/schedule-proposals',
      query: { service_date_from: serviceDate, service_date_to: serviceDate },
    });
    return response.body.items.map((item) => toScheduleProposalSummary(item));
  }

  /** GET /schedule-proposals/{id}: the proposal with its shifts (API.md 10.3). */
  async get(id: string): Promise<ScheduleProposalView> {
    const response = await this.http.request<ProposalDto>({
      method: 'GET',
      path: `/schedule-proposals/${encodeURIComponent(id)}`,
    });
    return toScheduleProposal(this.adapter, response.body);
  }

  /**
   * POST /schedule-items/{id}/execution. The body is built field by field (the API rejects unknown
   * fields); times go only when the shift has them and a note only when there is one.
   */
  async recordExecution(input: ShiftExecutionInput): Promise<ShiftExecutionView> {
    const response = await this.http.request<ShiftExecutionDto>({
      method: 'POST',
      path: `/schedule-items/${encodeURIComponent(input.scheduleItemId)}/execution`,
      body: {
        status: input.status,
        ...(input.actualStart === null ? {} : { actual_start: input.actualStart }),
        ...(input.actualEnd === null ? {} : { actual_end: input.actualEnd }),
        ...(input.note === '' ? {} : { note: input.note }),
        ...(input.supersedesId === null ? {} : { supersedes_id: input.supersedesId }),
      },
    });
    return toShiftExecution(response.body);
  }
}
