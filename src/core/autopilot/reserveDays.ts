const MS_PER_DAY = 86_400_000;
const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_OFFSET = 1;

export interface ReservePoint {
  /** Calendar day YYYY-MM-DD. */
  readonly dayKey: string;
  readonly p50: number;
}

/**
 * `days` is how many days from today until the expected level (p50) reaches the reserve. When the
 * forecast never gets there, `atLeast` says the figure is a lower bound (the horizon of the
 * forecast). `null` when there is not enough to say anything.
 */
export interface ReserveDays {
  readonly days: number;
  readonly atLeast: boolean;
}

function dayNumber(dayKey: string): number | null {
  const match = CALENDAR_DAY.exec(dayKey);
  if (match === null) {
    return null;
  }
  const [, year = '', month = '', day = ''] = match;
  return Date.UTC(Number(year), Number(month) - MONTH_OFFSET, Number(day)) / MS_PER_DAY;
}

/**
 * Days of reserve: the first forecast day whose median is at or under the reserve level, counted
 * from `today`. A level already at or under the reserve is 0 days. Pure; the screen only formats.
 */
export function reserveDays(input: {
  readonly today: string;
  readonly currentLevel: number | null;
  readonly reserveLevel: number | null;
  readonly points: readonly ReservePoint[];
}): ReserveDays | null {
  const { today, currentLevel, reserveLevel, points } = input;
  const start = dayNumber(today);
  if (reserveLevel === null || start === null) {
    return null;
  }
  if (currentLevel !== null && currentLevel <= reserveLevel) {
    return { days: 0, atLeast: false };
  }
  const dated = points
    .map((point) => ({ at: dayNumber(point.dayKey), p50: point.p50 }))
    .filter(
      (point): point is { at: number; p50: number } =>
        point.at !== null && Number.isFinite(point.p50),
    )
    .sort((a, b) => a.at - b.at);
  const last = dated[dated.length - 1];
  if (last === undefined) {
    return null;
  }
  const reached = dated.find((point) => point.p50 <= reserveLevel);
  if (reached !== undefined) {
    return { days: Math.max(0, reached.at - start), atLeast: false };
  }
  return { days: Math.max(0, last.at - start), atLeast: true };
}
