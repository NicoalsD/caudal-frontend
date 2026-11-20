import type { OperatingWindow } from './ruleSetParts';

const TIME_OF_DAY = /^(?<hours>[01]\d|2[0-3]):(?<minutes>[0-5]\d)$/;
const MINUTES_PER_HOUR = 60;

/** Minutes since midnight for "HH:MM" (00:00 to 23:59), or null if the text is not a time of day. */
export function timeToMinutes(text: string): number | null {
  const match = TIME_OF_DAY.exec(text.trim());
  if (match?.groups === undefined) {
    return null;
  }
  return Number(match.groups.hours) * MINUTES_PER_HOUR + Number(match.groups.minutes);
}

export interface WindowAnalysis {
  /** Positions of windows whose end is not after their start. */
  readonly inverted: readonly number[];
  /** Positions of windows that cross another window of the same day. */
  readonly overlapping: readonly number[];
}

/**
 * Checks the operating windows. A window is [start, end) inside one day (the database requires
 * end > start, so none crosses midnight). Windows are compared per day: "every day" windows are a
 * group of their own. Windows that touch (one ends when the next starts) do not overlap.
 */
export function analyzeWindows(windows: readonly OperatingWindow[]): WindowAnalysis {
  const inverted: number[] = [];
  const overlapping = new Set<number>();
  const byDay = new Map<number | null, { index: number; start: number; end: number }[]>();

  windows.forEach((window, index) => {
    const start = timeToMinutes(window.start);
    const end = timeToMinutes(window.end);
    if (start === null || end === null) {
      return;
    }
    if (end <= start) {
      inverted.push(index);
      return;
    }
    const group = byDay.get(window.dayOfWeek) ?? [];
    group.push({ index, start, end });
    byDay.set(window.dayOfWeek, group);
  });

  for (const group of byDay.values()) {
    const sorted = [...group].sort((a, b) => a.start - b.start);
    sorted.forEach((current, position) => {
      const previous = sorted[position - 1];
      if (previous !== undefined && current.start < previous.end) {
        overlapping.add(previous.index);
        overlapping.add(current.index);
      }
    });
  }
  return { inverted, overlapping: [...overlapping].sort((a, b) => a - b) };
}

/** Same windows in any order. Times are compared as written ("05:00"). */
export function sameWindows(a: readonly OperatingWindow[], b: readonly OperatingWindow[]): boolean {
  const key = (window: OperatingWindow): string =>
    `${String(window.dayOfWeek)}|${window.start}|${window.end}`;
  const left = a.map(key).sort();
  const right = b.map(key).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
