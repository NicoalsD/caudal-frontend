import { DomainError } from '../core/errors/DomainError';
import { planImportBatches } from '../core/imports/planImportBatches';
import type { ImportBatchLimits } from '../core/imports/planImportBatches';
import type { ReadingImportRow } from '../core/imports/readingImport';
import { IMPORT_BATCH_MAX_BYTES, IMPORT_BATCH_MAX_ROWS } from '../core/policy/clientPolicy';
import type { ReadingImportInput, ReadingImportResultView } from '../services/api/views';

/** What the importer needs from the API: one batch at a time. */
export interface ReadingImportApi {
  importReadings(input: ReadingImportInput): Promise<ReadingImportResultView>;
}

/** SHA-256 hex of a text. Injected so the importer runs the same in tests and in the browser. */
export type Digest = (text: string) => Promise<string>;

/** What stays the same for the whole file (the scenario that generated it). */
export interface ReadingImportRequest {
  readonly aqueductId: string;
  readonly scenarioName: string;
  readonly seed: number;
  readonly simulatorVersion: string;
}

export interface ImportedRejection {
  /** Position of the row in the whole file, from 1 (data rows only). */
  readonly row: number;
  readonly code: string;
}

export interface ReadingImportSummary {
  readonly batches: number;
  /** Batches the server had already imported (same file hash): they are not sent twice. */
  readonly alreadyImported: number;
  readonly rowsReceived: number;
  readonly rowsAccepted: number;
  readonly rowsRejected: number;
  readonly rejections: readonly ImportedRejection[];
}

const SHA256_HEX_LENGTH = 64;
const NO_DIGEST = '0'.repeat(SHA256_HEX_LENGTH);
const CONFLICT_CODE = 'CONFLICT';
const FIRST_POSITION = 1;

/**
 * Sends the rows of a simulated file in requests that respect the server's limits (API.md 17).
 * Each request carries the hash of its own rows, so the server recognizes a repeated request.
 * A batch the server already has is counted, not treated as a failure.
 */
export class ReadingImporter {
  constructor(
    private readonly api: ReadingImportApi,
    private readonly digest: Digest,
    private readonly limits: ImportBatchLimits = {
      maxRows: IMPORT_BATCH_MAX_ROWS,
      maxBytes: IMPORT_BATCH_MAX_BYTES,
    },
  ) {}

  async run(
    request: ReadingImportRequest,
    rows: readonly ReadingImportRow[],
    onBatch: (sent: number, total: number) => void = () => undefined,
  ): Promise<ReadingImportSummary> {
    const withoutRows = JSON.stringify({
      aqueduct_id: request.aqueductId,
      scenario_name: request.scenarioName,
      seed: request.seed,
      simulator_version: request.simulatorVersion,
      file_sha256: NO_DIGEST,
      rows: [],
    });
    const batches = planImportBatches(rows, withoutRows, this.limits);
    const summary = { alreadyImported: 0, rowsReceived: 0, rowsAccepted: 0, rowsRejected: 0 };
    const rejections: ImportedRejection[] = [];
    let offset = 0;
    for (const [index, batch] of batches.entries()) {
      onBatch(index + FIRST_POSITION, batches.length);
      const fileSha256 = await this.digest(JSON.stringify(batch));
      try {
        const result = await this.api.importReadings({ ...request, fileSha256, rows: batch });
        summary.rowsReceived += result.rowsReceived;
        summary.rowsAccepted += result.rowsAccepted;
        summary.rowsRejected += result.rowsRejected;
        for (const item of result.rejections) {
          rejections.push({ row: offset + item.row, code: item.code });
        }
      } catch (error) {
        if (!(error instanceof DomainError && error.code === CONFLICT_CODE)) {
          throw error;
        }
        summary.alreadyImported += 1;
      }
      offset += batch.length;
    }
    return { batches: batches.length, ...summary, rejections };
  }
}
