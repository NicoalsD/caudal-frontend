/** A parsed CSV file: rows of text cells, as they appear in the file. */
export type CsvTable = readonly (readonly string[])[];

const BYTE_ORDER_MARK = '﻿';
const QUOTE = '"';
const SEPARATOR = ',';
const LINE_FEED = '\n';
const CARRIAGE_RETURN = '\r';
const NEXT = 1;
const ESCAPED_QUOTE_LENGTH = 2;
const BLANK_LINE_CELLS = 1;

/**
 * Parses CSV text with quoted cells ("a, b", "say ""hi""") and CRLF or LF line ends. Blank lines
 * are skipped. It never evaluates anything: the cells stay text.
 */
export function parseCsv(text: string): CsvTable {
  const source = text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let index = 0;
  while (index < source.length) {
    const char = source.charAt(index);
    if (quoted) {
      if (char === QUOTE && source.charAt(index + NEXT) === QUOTE) {
        cell += QUOTE;
        index += ESCAPED_QUOTE_LENGTH;
        continue;
      }
      if (char === QUOTE) {
        quoted = false;
      } else {
        cell += char;
      }
      index += 1;
      continue;
    }
    if (char === QUOTE) {
      quoted = true;
    } else if (char === SEPARATOR) {
      row.push(cell);
      cell = '';
    } else if (char === LINE_FEED) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== CARRIAGE_RETURN) {
      cell += char;
    }
    index += 1;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((line) => !(line.length === BLANK_LINE_CELLS && line[0]?.trim() === ''));
}
