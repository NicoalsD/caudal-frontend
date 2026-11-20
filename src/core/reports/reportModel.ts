/** The numbers of a period (GET /reports, API.md 20.9) as the screens use them. */

export interface ReportLevels {
  readonly readings: number;
  readonly min: number | null;
  readonly max: number | null;
  readonly avg: number | null;
}

export interface ShiftsRow {
  /** The server groups by the sector name. */
  readonly sector: string;
  readonly planned: number;
  readonly plannedHours: number;
  readonly completed: number;
  readonly partial: number;
  readonly notExecuted: number;
}

export interface CommandRow {
  readonly origin: string;
  readonly status: string;
  readonly total: number;
}

export interface DecisionRow {
  readonly source: string;
  readonly action: string;
  readonly status: string;
  readonly total: number;
}

export interface IncidentRow {
  readonly category: string;
  readonly status: string;
  readonly total: number;
}

export interface AnomalyRow {
  readonly kind: string;
  readonly total: number;
}

export interface ReportAggregates {
  readonly levels: ReportLevels;
  readonly shifts: readonly ShiftsRow[];
  readonly commands: readonly CommandRow[];
  readonly decisions: readonly DecisionRow[];
  readonly incidents: readonly IncidentRow[];
  readonly anomalies: readonly AnomalyRow[];
}

export interface CountEntry {
  readonly key: string;
  readonly total: number;
}

/** Sums `total` by a key, keeping the order of first appearance. */
export function sumBy<Row extends { readonly total: number }>(
  rows: readonly Row[],
  keyOf: (row: Row) => string,
): CountEntry[] {
  const sums = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    sums.set(key, (sums.get(key) ?? 0) + row.total);
  }
  return [...sums].map(([key, total]) => ({ key, total }));
}

export function totalOf(rows: readonly { readonly total: number }[]): number {
  return rows.reduce((sum, row) => sum + row.total, 0);
}

/** How many decisions the language model wrote and how many the fallback rules did. */
export function llmShare(rows: readonly DecisionRow[]): {
  readonly llm: number;
  readonly rules: number;
} {
  const bySource = sumBy(rows, (row) => row.source);
  const count = (source: string): number => bySource.find((e) => e.key === source)?.total ?? 0;
  return { llm: count('LLM'), rules: count('RULES') };
}
