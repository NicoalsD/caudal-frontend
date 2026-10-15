import { describe, expect, it } from 'vitest';

import { planImportBatches } from './planImportBatches';

const FIXED = '{"rows":[]}';
/** The fixed part of FIXED: its bytes, as the planner counts them. */
const FIXED_BYTES = 11;
/** A quoted row of `row()` is 10 bytes: the quotes plus 8 characters. */
const ROW_BYTES = 10;
const ROW_DIGITS = 7;
const ROW_PREFIX = 'r';
const ROOMY_BYTES = 10_000;
const TWO = 2;
const FOUR = 4;
const FIVE = 5;
const THREE = 3;
const ROWS_UNLIMITED = 100;
const ONE_BYTE = 1;
const BIG_ROW_BYTES = 100;
const SMALL_LIMIT_BYTES = 50;

const row = (index: number) => `${ROW_PREFIX}${String(index).padStart(ROW_DIGITS, '0')}`;

describe('planImportBatches', () => {
  it('keeps every row in one request when both limits allow it', () => {
    const batches = planImportBatches([row(1), row(TWO)], FIXED, {
      maxRows: FIVE,
      maxBytes: 1_000,
    });
    expect(batches).toEqual([[row(1), row(TWO)]]);
  });

  it('starts a new request when the row limit is reached', () => {
    const rows = [row(1), row(TWO), row(THREE), row(FOUR), row(FIVE)];
    const batches = planImportBatches(rows, FIXED, { maxRows: TWO, maxBytes: ROOMY_BYTES });
    expect(batches.map((batch) => batch.length)).toEqual([TWO, TWO, ONE_BYTE]);
    expect(batches.flat()).toEqual(rows);
  });

  it('starts a new request before the body would pass the byte limit', () => {
    const rows = [row(1), row(TWO), row(THREE)];
    // The fixed part, two quoted rows and the comma between them: the third row does not fit.
    const limit = FIXED_BYTES + ROW_BYTES * TWO + ONE_BYTE;
    const batches = planImportBatches(rows, FIXED, { maxRows: ROWS_UNLIMITED, maxBytes: limit });
    expect(batches.map((batch) => batch.length)).toEqual([TWO, ONE_BYTE]);
  });

  it('gives a row larger than the limit a request of its own', () => {
    const big = 'x'.repeat(BIG_ROW_BYTES);
    const batches = planImportBatches([row(1), big, row(TWO)], FIXED, {
      maxRows: ROWS_UNLIMITED,
      maxBytes: SMALL_LIMIT_BYTES,
    });
    expect(batches).toEqual([[row(1)], [big], [row(TWO)]]);
  });

  it('is empty for no rows', () => {
    expect(planImportBatches([], FIXED, { maxRows: ONE_BYTE, maxBytes: ONE_BYTE })).toEqual([]);
  });
});
