import type { CsvTable } from './csvTable';

/**
 * The columns of a file of simulated readings (one reading per row, API.md 7.1 and 17.1). The
 * header names are the API field names. `note` is optional and may be left out of the file.
 */
export const READING_IMPORT_COLUMNS = [
  'id',
  'tank_id',
  'gauge_value',
  'water_appearance_code',
  'damage_noticed',
  'observed_at',
] as const;

/** One reading of the file, ready for the request. Values the file cannot type stay as text. */
export interface ReadingImportRow {
  readonly id: string;
  readonly tank_id: string;
  readonly gauge_value: number | string;
  readonly water_appearance_code: string;
  readonly damage_noticed: boolean | string;
  readonly note?: string;
  readonly observed_at: string;
}

export interface ReadingImportFile {
  /** Required columns the header does not have. Empty when the file can be imported. */
  readonly missingColumns: readonly string[];
  readonly rows: readonly ReadingImportRow[];
}

const TRUE_TEXTS: ReadonlySet<string> = new Set(['true', '1']);
const FALSE_TEXTS: ReadonlySet<string> = new Set(['false', '0', '']);
const DECIMAL_TEXT = /^-?\d+(?:\.\d+)?$/;

const NOT_FOUND = -1;

function cellValue(row: readonly string[], index: number | undefined): string {
  return index === undefined ? '' : (row[index] ?? '').trim();
}

/** "2.4" becomes a number; anything else stays text so the server can refuse it (no coercion). */
function gaugeOf(text: string): number | string {
  return DECIMAL_TEXT.test(text) ? Number(text) : text;
}

function flagOf(text: string): boolean | string {
  const normalized = text.toLowerCase();
  if (TRUE_TEXTS.has(normalized)) {
    return true;
  }
  return FALSE_TEXTS.has(normalized) ? false : text;
}

/**
 * Reads a table with the reading header. The first row is the header; the header is matched by
 * name, in any order. Rows keep the file order.
 */
export function toReadingImportFile(table: CsvTable): ReadingImportFile {
  const [header = [], ...body] = table;
  const names = header.map((name) => name.trim().toLowerCase());
  const position = (column: string): number | undefined => {
    const index = names.indexOf(column);
    return index === NOT_FOUND ? undefined : index;
  };
  const missingColumns = READING_IMPORT_COLUMNS.filter((column) => position(column) === undefined);
  if (missingColumns.length > 0) {
    return { missingColumns, rows: [] };
  }
  const note = position('note');
  const rows = body.map((line): ReadingImportRow => {
    const text = (column: (typeof READING_IMPORT_COLUMNS)[number]) =>
      cellValue(line, position(column));
    return {
      id: text('id'),
      tank_id: text('tank_id'),
      gauge_value: gaugeOf(text('gauge_value')),
      water_appearance_code: text('water_appearance_code'),
      damage_noticed: flagOf(text('damage_noticed')),
      ...(note === undefined ? {} : { note: cellValue(line, note) }),
      observed_at: text('observed_at'),
    };
  });
  return { missingColumns: [], rows };
}
