export interface ShiftSpan {
  readonly sectorId: string;
  readonly startMs: number;
  readonly endMs: number;
}

export interface ShiftsNow<Shift extends ShiftSpan> {
  /** The shift that is running now, or null. */
  readonly current: Shift | null;
  /** The next shift to start after now, or null when the day has no more. */
  readonly next: Shift | null;
}

/** The running shift and the next one, for a list of shifts of one day in any order. */
export function pickShifts<Shift extends ShiftSpan>(
  shifts: readonly Shift[],
  nowMs: number,
): ShiftsNow<Shift> {
  const current = shifts.find((shift) => shift.startMs <= nowMs && nowMs < shift.endMs) ?? null;
  const upcoming = shifts
    .filter((shift) => shift.startMs > nowMs)
    .sort((a, b) => a.startMs - b.startMs);
  return { current, next: upcoming[0] ?? null };
}

const MS_PER_MINUTE = 60_000;

/** Whole minutes from now to a moment, rounded up so "0 min" is never shown while it lasts. */
export function minutesUntil(targetMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((targetMs - nowMs) / MS_PER_MINUTE));
}
