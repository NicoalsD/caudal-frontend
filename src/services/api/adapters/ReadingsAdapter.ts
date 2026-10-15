import type { CatalogItemView, ReadingBatchResultView, ReadingResultView } from '../views';
import type { ApiDtoAdapter } from './ApiDtoAdapter';

/** Shapes of API.md sections 4.2 and 7.1 (hand written: not in the generated schema yet). */
export interface CatalogItemDto {
  readonly code: string;
  readonly label_es: string;
  readonly sort_order: number;
}

export interface CatalogDto {
  readonly items: readonly CatalogItemDto[];
}

export interface ReadingDto {
  readonly id: string;
  readonly tank_id: string;
  readonly gauge_value: number;
  readonly observed_at: string;
  readonly validation_status: string;
}

export interface ReadingIssueDto {
  readonly code: string;
  readonly severity?: string;
}

export interface ReadingResponseDto {
  readonly reading: ReadingDto;
  readonly issues?: readonly ReadingIssueDto[];
  readonly idempotent_replay?: boolean;
}

export function toCatalogItem(dto: CatalogItemDto): CatalogItemView {
  return { code: dto.code, label: dto.label_es, sortOrder: dto.sort_order };
}

export function toReadingResult(
  adapter: ApiDtoAdapter,
  dto: ReadingResponseDto,
): ReadingResultView {
  return {
    id: dto.reading.id,
    gaugeValue: adapter.toDecimal('reading.gauge_value', dto.reading.gauge_value),
    observedAt: adapter.toTimestamp('reading.observed_at', dto.reading.observed_at),
    validationStatus: dto.reading.validation_status,
    issueCodes: (dto.issues ?? []).map((issue) => issue.code),
    isReplay: dto.idempotent_replay === true,
  };
}

/** Answer of POST /readings/batch (API.md 7.2). Each result carries the reading's client id. */
export interface ReadingBatchResponseDto {
  readonly sync_batch_id: string;
  readonly idempotent_replay: boolean;
  readonly results: readonly {
    readonly id: string;
    readonly status: string;
    readonly error?: { readonly code: string };
  }[];
}

export function toReadingBatchResult(dto: ReadingBatchResponseDto): ReadingBatchResultView {
  return {
    syncBatchId: dto.sync_batch_id,
    idempotentReplay: dto.idempotent_replay,
    answers: dto.results.map((item) => ({
      id: item.id,
      status: item.status,
      errorCode: item.error?.code ?? null,
    })),
  };
}
