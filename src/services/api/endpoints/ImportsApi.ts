import type { ReadingImportRow } from '../../../core/imports/readingImport';
import type { HttpClient } from '../../http/HttpClient';
import type { ReadingImportInput, ReadingImportResultView } from '../views';

/** Answer of POST /imports/readings (API.md 17). Shapes are written by hand, as the other areas. */
interface ReadingImportResponseDto {
  readonly import_batch_id: string;
  readonly rows_received: number;
  readonly rows_accepted: number;
  readonly rows_rejected: number;
  readonly rejections: readonly { readonly row: number; readonly code: string }[];
}

/** Simulated history of the demo aqueduct (API.md section 17). Only PROJECT_TEAM may call it. */
export class ImportsApi {
  constructor(private readonly http: HttpClient) {}

  /** POST /imports/readings: one batch of rows, at most 5.000 rows and 1 MiB. */
  async importReadings(input: ReadingImportInput): Promise<ReadingImportResultView> {
    const response = await this.http.request<ReadingImportResponseDto>({
      method: 'POST',
      path: '/imports/readings',
      body: {
        aqueduct_id: input.aqueductId,
        scenario_name: input.scenarioName,
        seed: input.seed,
        simulator_version: input.simulatorVersion,
        file_sha256: input.fileSha256,
        rows: input.rows.map((row) => toRowBody(row)),
      },
    });
    return {
      importBatchId: response.body.import_batch_id,
      rowsReceived: response.body.rows_received,
      rowsAccepted: response.body.rows_accepted,
      rowsRejected: response.body.rows_rejected,
      rejections: response.body.rejections.map((item) => ({ row: item.row, code: item.code })),
    };
  }
}

/** One row as the API takes it (API.md 7.1), with no unknown fields. */
function toRowBody(row: ReadingImportRow): Record<string, unknown> {
  return {
    id: row.id,
    tank_id: row.tank_id,
    gauge_value: row.gauge_value,
    water_appearance_code: row.water_appearance_code,
    damage_noticed: row.damage_noticed,
    ...(row.note === undefined || row.note === '' ? {} : { note: row.note }),
    observed_at: row.observed_at,
  };
}
