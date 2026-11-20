import { DomainError } from '../../../core/errors/DomainError';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toPublishedSchedule, toShiftExecution } from '../adapters/ScheduleAdapter';
import type { components } from '../schema';
import type { PublishedScheduleView, ShiftExecutionInput, ShiftExecutionView } from '../views';

type PublishedScheduleDto = components['schemas']['PublishedSchedule'];
type ShiftExecutionDto = components['schemas']['ShiftExecution'];

const NOT_FOUND_CODE = 'NOT_FOUND';

/** Shifts of a day and their executions (API.md 11). */
export class ScheduleApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /**
   * GET /days/{date}/schedule: the published shifts of a service day, readable by the operator
   * (SCHEDULE_VIEW). A day with no published schedule answers 404: that is null here.
   */
  async getPublished(serviceDate: string): Promise<PublishedScheduleView | null> {
    try {
      const response = await this.http.request<PublishedScheduleDto>({
        method: 'GET',
        path: `/days/${encodeURIComponent(serviceDate)}/schedule`,
      });
      return toPublishedSchedule(this.adapter, response.body);
    } catch (error) {
      if (error instanceof DomainError && error.code === NOT_FOUND_CODE) {
        return null;
      }
      throw error;
    }
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
