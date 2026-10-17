/** How a shift went (API.md 11.1). Same words as the server's enum. */
export const SHIFT_STATUSES = ['COMPLETED', 'PARTIAL', 'NOT_EXECUTED'] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

/** America/Bogota has no daylight saving time: the offset is fixed. */
export const BOGOTA_UTC_OFFSET = '-05:00';

/** The "HH:mm" of a time input (24 h). */
const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

/** What the plumber typed for one shift. Times are "HH:mm" in America/Bogota, or empty. */
export interface ShiftDraft {
  readonly status: ShiftStatus;
  readonly startTime: string;
  readonly endTime: string;
}

export type ExecutionTimesError = 'START_REQUIRED' | 'TIME_INVALID' | 'END_NOT_AFTER_START';

export type ExecutionTimesResult =
  | { readonly ok: true; readonly actualStart: string | null; readonly actualEnd: string | null }
  | {
      readonly ok: false;
      readonly error: ExecutionTimesError;
      readonly field: 'startTime' | 'endTime';
    };

/**
 * Turns the draft into the times the API takes. COMPLETED and NOT_EXECUTED send no times (the
 * server uses the shift's own, or none). PARTIAL needs a start; the end is optional and must be
 * after the start when it is given.
 */
export function toExecutionTimes(serviceDate: string, draft: ShiftDraft): ExecutionTimesResult {
  if (draft.status !== 'PARTIAL') {
    return { ok: true, actualStart: null, actualEnd: null };
  }
  if (draft.startTime === '') {
    return { ok: false, error: 'START_REQUIRED', field: 'startTime' };
  }
  if (!TIME_OF_DAY.test(draft.startTime)) {
    return { ok: false, error: 'TIME_INVALID', field: 'startTime' };
  }
  if (draft.endTime === '') {
    return { ok: true, actualStart: instantOf(serviceDate, draft.startTime), actualEnd: null };
  }
  if (!TIME_OF_DAY.test(draft.endTime)) {
    return { ok: false, error: 'TIME_INVALID', field: 'endTime' };
  }
  // Same day and "HH:mm" text: comparing the strings compares the times.
  if (draft.endTime <= draft.startTime) {
    return { ok: false, error: 'END_NOT_AFTER_START', field: 'endTime' };
  }
  return {
    ok: true,
    actualStart: instantOf(serviceDate, draft.startTime),
    actualEnd: instantOf(serviceDate, draft.endTime),
  };
}

/** ISO-8601 instant with the Bogota offset, for a service day (YYYY-MM-DD) and an "HH:mm". */
function instantOf(serviceDate: string, time: string): string {
  return `${serviceDate}T${time}:00${BOGOTA_UTC_OFFSET}`;
}
