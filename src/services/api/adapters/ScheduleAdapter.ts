import { SHIFT_STATUSES } from '../../../core/execution/shiftExecution';
import type { ShiftStatus } from '../../../core/execution/shiftExecution';
import type { components } from '../schema';
import type {
  ScheduleItemView,
  ScheduleProposalSummaryView,
  ScheduleProposalView,
  ShiftExecutionView,
} from '../views';
import type { ApiDtoAdapter } from './ApiDtoAdapter';
import { InvalidDtoError } from './InvalidDtoError';

type ScheduleItemDto = components['schemas']['ScheduleItem'];
type ScheduleProposalDto = components['schemas']['ScheduleProposal'];
type ScheduleProposalSummaryDto = components['schemas']['ScheduleProposalSummary'];
type ShiftExecutionDto = components['schemas']['ShiftExecution'];

function toShiftStatus(value: string): ShiftStatus {
  const found = SHIFT_STATUSES.find((status) => status === value);
  if (found === undefined) {
    throw new InvalidDtoError('status');
  }
  return found;
}

/** Shifts of a proposal (API.md 10.3). Times are shown in Bogota time by the screens. */
export function toScheduleItem(adapter: ApiDtoAdapter, dto: ScheduleItemDto): ScheduleItemView {
  return {
    id: dto.id,
    sectorId: dto.sector_id,
    sequence: dto.sequence,
    startAt: adapter.toTimestamp('start_at', dto.start_at),
    endAt: adapter.toTimestamp('end_at', dto.end_at),
  };
}

export function toScheduleProposal(
  adapter: ApiDtoAdapter,
  dto: ScheduleProposalDto,
): ScheduleProposalView {
  return {
    id: dto.id,
    serviceDate: dto.service_date,
    status: dto.status,
    items: dto.items.map((item) => toScheduleItem(adapter, item)),
  };
}

export function toScheduleProposalSummary(
  dto: ScheduleProposalSummaryDto,
): ScheduleProposalSummaryView {
  return { id: dto.id, serviceDate: dto.service_date, status: dto.status };
}

export function toShiftExecution(dto: ShiftExecutionDto): ShiftExecutionView {
  return {
    id: dto.id,
    scheduleItemId: dto.schedule_item_id,
    status: toShiftStatus(dto.status),
    supersedesId: dto.supersedes_id ?? null,
  };
}
