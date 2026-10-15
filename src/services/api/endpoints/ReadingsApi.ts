import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toReadingBatchResult } from '../adapters/ReadingsAdapter';
import type { ReadingBatchResponseDto } from '../adapters/ReadingsAdapter';
import { toReadingResult } from '../adapters/ReadingsAdapter';
import type { ReadingResponseDto } from '../adapters/ReadingsAdapter';
import type {
  ReadingBatchInput,
  ReadingBatchResultView,
  ReadingInput,
  ReadingResultView,
} from '../views';

/** Tank readings (API.md section 7). */
export class ReadingsApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /**
   * POST /readings. The client UUID travels in the body as `id`, so sending the same reading
   * again answers 200 with `idempotent_replay` instead of storing it twice.
   */
  async submit(input: ReadingInput): Promise<ReadingResultView> {
    const response = await this.http.request<ReadingResponseDto>({
      method: 'POST',
      path: '/readings',
      body: toReadingBody(input),
      idempotencyKey: input.id,
    });
    return toReadingResult(this.adapter, response.body);
  }

  /**
   * POST /readings/batch: the offline queue. Each reading is judged on its own; the answer has one
   * item per reading, in the order sent. The body is built field by field (the API rejects
   * unknown fields).
   */
  async submitBatch(input: ReadingBatchInput): Promise<ReadingBatchResultView> {
    const response = await this.http.request<ReadingBatchResponseDto>({
      method: 'POST',
      path: '/readings/batch',
      body: {
        sync_batch_id: input.syncBatchId,
        readings: input.readings.map((reading) => toReadingBody(reading)),
      },
    });
    return toReadingBatchResult(response.body);
  }
}

/** The reading as the API takes it (section 7.1), snake_case, with no unknown fields. */
function toReadingBody(input: ReadingInput): Record<string, unknown> {
  return {
    id: input.id,
    tank_id: input.tankId,
    gauge_value: input.gaugeValue,
    water_appearance_code: input.waterAppearanceCode,
    damage_noticed: input.damageNoticed,
    ...(input.note === '' ? {} : { note: input.note }),
    observed_at: input.observedAt.toISOString(),
  };
}
