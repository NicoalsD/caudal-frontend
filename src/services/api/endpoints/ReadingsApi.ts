import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toReadingResult } from '../adapters/ReadingsAdapter';
import type { ReadingResponseDto } from '../adapters/ReadingsAdapter';
import type { ReadingInput, ReadingResultView } from '../views';

/** Tank readings (API.md section 7). */
export class ReadingsApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /**
   * POST /readings. The client UUID travels in the body as `id`, so sending the same reading
   * again answers 200 with `idempotent_replay` instead of storing it twice. The body is built
   * field by field: the API rejects unknown fields.
   */
  async submit(input: ReadingInput): Promise<ReadingResultView> {
    const body = {
      id: input.id,
      tank_id: input.tankId,
      gauge_value: input.gaugeValue,
      water_appearance_code: input.waterAppearanceCode,
      damage_noticed: input.damageNoticed,
      ...(input.note === '' ? {} : { note: input.note }),
      observed_at: input.observedAt.toISOString(),
    };
    const response = await this.http.request<ReadingResponseDto>({
      method: 'POST',
      path: '/readings',
      body,
      idempotencyKey: input.id,
    });
    return toReadingResult(this.adapter, response.body);
  }
}
