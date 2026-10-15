import { SHIFT_STATUSES } from '../../../core/execution/shiftExecution';
import type { ShiftStatus } from '../../../core/execution/shiftExecution';
import type { components } from '../schema';
import type {
  DayClosureView,
  PublishedScheduleView,
  DayShiftView,
  ShiftExecutionView,
} from '../views';
import type { ApiDtoAdapter } from './ApiDtoAdapter';
import { InvalidDtoError } from './InvalidDtoError';

type ScheduleItemDto = components['schemas']['ScheduleItem'];
type PublishedScheduleDto = components['schemas']['PublishedSchedule'];
type ShiftExecutionDto = components['schemas']['ShiftExecution'];
type DayClosureDto = components['schemas']['DayClosure'];

function toShiftStatus(value: string): ShiftStatus {
  const found = SHIFT_STATUSES.find((status) => status === value);
  if (found === undefined) {
    throw new InvalidDtoError('status');
  }
  return found;
}

/** Shifts of a proposal (API.md 10.3). Times are shown in Bogota time by the screens. */
export function toScheduleItem(adapter: ApiDtoAdapter, dto: ScheduleItemDto): DayShiftView {
  return {
    id: dto.id,
    sectorId: dto.sector_id,
    sequence: dto.sequence,
    startAt: adapter.toTimestamp('start_at', dto.start_at),
    endAt: adapter.toTimestamp('end_at', dto.end_at),
  };
}

/** The published schedule of a day (GET /days/{date}/schedule). Items are the shifts of the day. */
export function toPublishedSchedule(
  adapter: ApiDtoAdapter,
  dto: PublishedScheduleDto,
): PublishedScheduleView {
  return {
    serviceDate: dto.service_date,
    proposalId: dto.proposal_id,
    publishedAt: adapter.toTimestamp('published_at', dto.published_at),
    items: dto.items.map((item) => toScheduleItem(adapter, item)),
  };
}

export function toShiftExecution(dto: ShiftExecutionDto): ShiftExecutionView {
  return {
    id: dto.id,
    scheduleItemId: dto.schedule_item_id,
    status: toShiftStatus(dto.status),
    supersedesId: dto.supersedes_id ?? null,
  };
}

/** The closure of a day with its executions (API.md 11.2). */
export function toDayClosure(adapter: ApiDtoAdapter, dto: DayClosureDto): DayClosureView {
  return {
    id: dto.id,
    serviceDate: dto.service_date,
    notes: dto.notes ?? null,
    closedAt: adapter.toTimestamp('closed_at', dto.closed_at),
    executions: dto.executions.map((execution) => toShiftExecution(execution)),
  };
}
