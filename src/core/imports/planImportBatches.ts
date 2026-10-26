import { utf8ByteLength } from './utf8ByteLength';

export interface ImportBatchLimits {
  /** Most rows in one request (API.md 17). */
  readonly maxRows: number;
  /** Most bytes of one request body (API.md 1.8). */
  readonly maxBytes: number;
}

/**
 * Splits the rows into requests that respect both limits. `bodyWithoutRows` is the JSON of the
 * request with an empty `rows` list: its size is the fixed part of every request. A single row
 * larger than the limit gets a request of its own, and the server answers with its own error.
 */
export function planImportBatches<Row>(
  rows: readonly Row[],
  bodyWithoutRows: string,
  limits: ImportBatchLimits,
): Row[][] {
  const fixedBytes = utf8ByteLength(bodyWithoutRows);
  const batches: Row[][] = [];
  let current: Row[] = [];
  let currentBytes = fixedBytes;
  for (const row of rows) {
    const rowBytes = utf8ByteLength(JSON.stringify(row));
    const separatorBytes = current.length === 0 ? 0 : 1;
    const fits =
      current.length < limits.maxRows &&
      currentBytes + separatorBytes + rowBytes <= limits.maxBytes;
    if (current.length > 0 && !fits) {
      batches.push(current);
      current = [];
      currentBytes = fixedBytes;
    }
    currentBytes += (current.length === 0 ? 0 : 1) + rowBytes;
    current.push(row);
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}
