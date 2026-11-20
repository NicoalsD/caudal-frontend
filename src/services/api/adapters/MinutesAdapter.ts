import type { components } from '../schema';
import type { MinutesEntryView, MinutesStatus, MinutesSummaryView, MinutesView } from '../views';
import type { ApiDtoAdapter } from './ApiDtoAdapter';
import { InvalidDtoError } from './InvalidDtoError';

type MinutesSummaryDto = components['schemas']['MinutesSummary'];
type MinutesDto = components['schemas']['Minutes'];
type MinutesEntryDto = components['schemas']['MinutesEntry'];

const MINUTES_STATUSES: readonly MinutesStatus[] = ['DRAFT', 'FINAL'];

function toMinutesStatus(value: string): MinutesStatus {
  const found = MINUTES_STATUSES.find((status) => status === value);
  if (found === undefined) {
    throw new InvalidDtoError('status');
  }
  return found;
}

function toEntry(adapter: ApiDtoAdapter, dto: MinutesEntryDto): MinutesEntryView {
  return {
    source: dto.source,
    sourceId: dto.source_id,
    at: adapter.toTimestamp('at', dto.at),
    summary: dto.summary,
  };
}

export function toMinutesSummary(
  adapter: ApiDtoAdapter,
  dto: MinutesSummaryDto,
): MinutesSummaryView {
  return {
    id: dto.id,
    periodFrom: dto.period_from,
    periodTo: dto.period_to,
    status: toMinutesStatus(dto.status),
    generatedAt: adapter.toTimestamp('generated_at', dto.generated_at),
    finalizedAt:
      dto.finalized_at === undefined || dto.finalized_at === null
        ? null
        : adapter.toTimestamp('finalized_at', dto.finalized_at),
    pdfSha256: dto.pdf_sha256 ?? null,
  };
}

/** The acta with its four sections, each one in the order the server wrote it. */
export function toMinutes(adapter: ApiDtoAdapter, dto: MinutesDto): MinutesView {
  const entries = (list: readonly MinutesEntryDto[]): MinutesEntryView[] =>
    list.map((entry) => toEntry(adapter, entry));
  return {
    ...toMinutesSummary(adapter, dto),
    content: {
      observed: entries(dto.content.observed),
      estimated: entries(dto.content.estimated),
      inferred: entries(dto.content.inferred),
      confirmed: entries(dto.content.confirmed),
    },
  };
}
