import { describe, expect, it } from 'vitest';

import { DomainError } from '../core/errors/DomainError';
import type { ReadingImportRow } from '../core/imports/readingImport';
import type { ReadingImportInput, ReadingImportResultView } from '../services/api/views';
import { ReadingImporter } from './ReadingImporter';
import type { ReadingImportApi } from './ReadingImporter';

const TANK = '0190f3a2-0000-7000-8000-0000000000e1';
const REQUEST = {
  aqueductId: 'a-1',
  scenarioName: 'normal-year',
  seed: 42,
  simulatorVersion: '0.3.0',
};
const ROWS_PER_REQUEST = 2;
const SMALL_LIMITS = { maxRows: ROWS_PER_REQUEST, maxBytes: 100_000 };
const DIGEST_WIDTH = 64;
const FIVE_ROWS = 5;
const THREE_ROWS = 3;
const FIRST_CALL = 1;
const SECOND_CALL = 2;
const REJECTED_ROW = 2;
const NO_ACCEPTED = 0;
const BATCHES_FOR_FIVE_ROWS = 3;

function rowsOf(count: number): ReadingImportRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `r-${index + 1}`,
    tank_id: TANK,
    gauge_value: 2,
    water_appearance_code: 'NORMAL',
    damage_noticed: false,
    observed_at: '2026-10-01T08:00:00-05:00',
  }));
}

/** A stand-in digest: the start of the text, padded to 64 characters (different rows, different text). */
const digest = (text: string): Promise<string> =>
  Promise.resolve(text.slice(0, DIGEST_WIDTH).padEnd(DIGEST_WIDTH, '0'));

function fakeApi(
  answer: (input: ReadingImportInput, call: number) => ReadingImportResultView | Error,
) {
  const calls: ReadingImportInput[] = [];
  const api: ReadingImportApi = {
    importReadings: (input) => {
      calls.push(input);
      const result = answer(input, calls.length);
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
    },
  };
  return { api, calls };
}

const accepted = (
  rows: number,
  rejections: { row: number; code: string }[] = [],
): ReadingImportResultView => ({
  importBatchId: `b-${rows}`,
  rowsReceived: rows,
  rowsAccepted: rows - rejections.length,
  rowsRejected: rejections.length,
  rejections,
});

describe('ReadingImporter', () => {
  it('sends the rows in requests within the limits, each with its own hash', async () => {
    const { api, calls } = fakeApi((input) => accepted(input.rows.length));
    const importer = new ReadingImporter(api, digest, SMALL_LIMITS);

    const summary = await importer.run(REQUEST, rowsOf(FIVE_ROWS));

    expect(calls.map((call) => call.rows.length)).toEqual([
      ROWS_PER_REQUEST,
      ROWS_PER_REQUEST,
      FIRST_CALL,
    ]);
    expect(new Set(calls.map((call) => call.fileSha256)).size).toBe(calls.length);
    expect(calls[0]).toMatchObject({ aqueductId: 'a-1', scenarioName: 'normal-year', seed: 42 });
    expect(summary).toMatchObject({
      batches: BATCHES_FOR_FIVE_ROWS,
      rowsReceived: FIVE_ROWS,
      rowsAccepted: FIVE_ROWS,
      rowsRejected: NO_ACCEPTED,
    });
  });

  it('reports the progress of each request before it is sent', async () => {
    const { api } = fakeApi((input) => accepted(input.rows.length));
    const progress: [number, number][] = [];
    await new ReadingImporter(api, digest, SMALL_LIMITS).run(
      REQUEST,
      rowsOf(THREE_ROWS),
      (sent, total) => {
        progress.push([sent, total]);
      },
    );

    expect(progress).toEqual([
      [FIRST_CALL, SECOND_CALL],
      [SECOND_CALL, SECOND_CALL],
    ]);
  });

  it('gives each rejected row its position in the whole file', async () => {
    const { api } = fakeApi((input, call) =>
      call === FIRST_CALL
        ? accepted(input.rows.length, [{ row: REJECTED_ROW, code: 'GAUGE_OUT_OF_RANGE' }])
        : accepted(input.rows.length),
    );

    const summary = await new ReadingImporter(api, digest, SMALL_LIMITS).run(
      REQUEST,
      rowsOf(THREE_ROWS),
    );

    expect(summary.rejections).toEqual([{ row: REJECTED_ROW, code: 'GAUGE_OUT_OF_RANGE' }]);
    expect(summary.rowsRejected).toBe(FIRST_CALL);
  });

  it('counts a request the server already has, and goes on', async () => {
    const { api } = fakeApi((input, call) =>
      call === FIRST_CALL
        ? new DomainError('CONFLICT', 'Ya importado.', { reason: 'FILE_ALREADY_IMPORTED' })
        : accepted(input.rows.length),
    );

    const summary = await new ReadingImporter(api, digest, SMALL_LIMITS).run(
      REQUEST,
      rowsOf(THREE_ROWS),
    );

    expect(summary).toMatchObject({
      alreadyImported: FIRST_CALL,
      rowsReceived: FIRST_CALL,
      batches: SECOND_CALL,
    });
  });

  it('stops on any other failure', async () => {
    const { api } = fakeApi(() => new DomainError('DEMO_ONLY', 'Solo demo.'));

    await expect(
      new ReadingImporter(api, digest, SMALL_LIMITS).run(REQUEST, rowsOf(FIRST_CALL)),
    ).rejects.toMatchObject({ code: 'DEMO_ONLY' });
  });
});
