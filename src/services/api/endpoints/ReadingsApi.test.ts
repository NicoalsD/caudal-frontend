import { describe, expect, it } from 'vitest';

import { FakeHttpClient, okResponse } from '../../../test/fakes/FakeHttpClient';
import { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { ReadingInput } from '../views';
import { ReadingsApi } from './ReadingsApi';

const READING: ReadingInput = {
  id: '6f1c0000-0000-4000-8000-000000000001',
  tankId: 't-1',
  gaugeValue: 2.1,
  waterAppearanceCode: 'NORMAL',
  damageNoticed: false,
  note: '',
  observedAt: new Date('2026-10-14T08:00:00.000Z'),
};

describe('ReadingsApi.submitBatch', () => {
  it('sends the batch with snake_case fields and no note when it is empty', async () => {
    const http = new FakeHttpClient(
      okResponse({ sync_batch_id: 'b-1', idempotent_replay: false, results: [] }),
    );
    await new ReadingsApi(http, new ApiDtoAdapter()).submitBatch({
      syncBatchId: 'b-1',
      readings: [READING],
    });

    expect(http.requests[0]).toMatchObject({ method: 'POST', path: '/readings/batch' });
    expect(http.requests[0]?.body).toEqual({
      sync_batch_id: 'b-1',
      readings: [
        {
          id: READING.id,
          tank_id: 't-1',
          gauge_value: 2.1,
          water_appearance_code: 'NORMAL',
          damage_noticed: false,
          observed_at: '2026-10-14T08:00:00.000Z',
        },
      ],
    });
  });

  it('answers one item per reading, with the error code of a refusal', async () => {
    const http = new FakeHttpClient(
      okResponse({
        sync_batch_id: 'b-1',
        idempotent_replay: true,
        results: [
          { id: 'a', status: 'REPLAYED' },
          { id: 'b', status: 'REJECTED', error: { code: 'GAUGE_OUT_OF_RANGE' } },
        ],
      }),
    );
    const result = await new ReadingsApi(http, new ApiDtoAdapter()).submitBatch({
      syncBatchId: 'b-1',
      readings: [READING],
    });

    expect(result).toEqual({
      syncBatchId: 'b-1',
      idempotentReplay: true,
      answers: [
        { id: 'a', status: 'REPLAYED', errorCode: null },
        { id: 'b', status: 'REJECTED', errorCode: 'GAUGE_OUT_OF_RANGE' },
      ],
    });
  });
});
