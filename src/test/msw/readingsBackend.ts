import { http, HttpResponse } from 'msw';

import { apiUrl } from './apiUrl';

/** One reading as the batch endpoint receives it (API.md 7.2), snake_case. */
export interface BatchReadingBody {
  readonly id: string;
  readonly tank_id: string;
  readonly gauge_value: number;
  readonly water_appearance_code: string;
  readonly damage_noticed: boolean;
  readonly note?: string;
  readonly observed_at: string;
}

export interface BatchRequestBody {
  readonly sync_batch_id: string;
  readonly readings: readonly BatchReadingBody[];
}

/** What the fake server answers for one reading: a status, and an error when it is refused. */
export interface BatchAnswer {
  readonly status: 'ACCEPTED' | 'REJECTED';
  readonly error?: { readonly code: string; readonly details?: Readonly<Record<string, unknown>> };
}

export type BatchAnswerFor = (reading: BatchReadingBody) => BatchAnswer;

const acceptAll: BatchAnswerFor = () => ({ status: 'ACCEPTED' });

/**
 * Fake POST /readings/batch. It keeps every body it receives, so tests can check what was sent
 * (the ids, the values), and answers each reading with `answerFor`. `down` makes the network fail.
 */
export function createReadingsBackend(answerFor: BatchAnswerFor = acceptAll) {
  const batches: BatchRequestBody[] = [];
  const state = { down: false };
  const handler = http.post(apiUrl('/readings/batch'), async ({ request }) => {
    if (state.down) {
      return HttpResponse.error();
    }
    const body = (await request.json()) as BatchRequestBody;
    batches.push(body);
    return HttpResponse.json({
      sync_batch_id: body.sync_batch_id,
      idempotent_replay: false,
      items_received: body.readings.length,
      results: body.readings.map((reading) => {
        const answer = answerFor(reading);
        return {
          id: reading.id,
          status: answer.status,
          ...(answer.error === undefined ? {} : { error: answer.error }),
        };
      }),
    });
  });
  return {
    handlers: [handler],
    batches,
    /** Makes every later send fail without an answer (no connection). */
    goDown: () => {
      state.down = true;
    },
    goUp: () => {
      state.down = false;
    },
  };
}
