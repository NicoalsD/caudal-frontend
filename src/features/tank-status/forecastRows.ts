/** One day of the chart. Absent series are left out so the drawing has no gap at zero. */
export interface ForecastRow {
  /** Calendar day as YYYY-MM-DD. */
  readonly dayKey: string;
  readonly observed?: number;
  readonly p10?: number;
  readonly p50?: number;
  readonly p90?: number;
  /** [p10, p90] for the band; never inverted. */
  readonly range?: readonly [number, number];
}

export interface ObservedLevel {
  readonly dayKey: string;
  readonly value: number;
}

export interface ForecastDay {
  readonly dayKey: string;
  readonly p10: number;
  readonly p50: number;
  readonly p90: number;
}

/**
 * The rows for the forecast chart: the observed level first, then each forecast day. A band with
 * p10 above p90 (a model error) is swapped, and a non-finite value is dropped instead of drawn as
 * zero.
 */
export function toForecastRows(
  observed: ObservedLevel | null,
  points: readonly ForecastDay[],
): ForecastRow[] {
  const rows: ForecastRow[] = [];
  if (observed !== null && Number.isFinite(observed.value)) {
    rows.push({ dayKey: observed.dayKey, observed: observed.value });
  }
  for (const point of points) {
    if (![point.p10, point.p50, point.p90].every(Number.isFinite)) {
      continue;
    }
    const low = Math.min(point.p10, point.p90);
    const high = Math.max(point.p10, point.p90);
    rows.push({
      dayKey: point.dayKey,
      p10: low,
      p50: point.p50,
      p90: high,
      range: [low, high],
    });
  }
  return rows.sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}
