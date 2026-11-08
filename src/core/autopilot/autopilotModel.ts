export const AUTOPILOT_MODES = ['MANUAL', 'ASSISTED', 'AUTOMATIC'] as const;
export type AutopilotMode = (typeof AUTOPILOT_MODES)[number];

export const DECISION_ACTIONS = ['OPEN', 'CLOSE', 'WAIT', 'INSPECT'] as const;
export type DecisionAction = (typeof DECISION_ACTIONS)[number];

export const DECISION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EXECUTED',
  'EXPIRED',
  'SKIPPED',
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const ANSWER_SOURCES = ['LLM', 'RULES'] as const;
export type AnswerSource = (typeof ANSWER_SOURCES)[number];

/** The mode the "take control" button switches to, and the one "give back" returns to. */
export const TAKE_CONTROL_MODE: AutopilotMode = 'MANUAL';
export const GIVE_BACK_MODE: AutopilotMode = 'AUTOMATIC';

/** Longest question the assistant accepts (contract v2, section A). */
export const QUESTION_MAX_LENGTH = 500;

/** Whether the person is driving: in MANUAL the autopilot only shows its decisions. */
export function isPlumberInControl(mode: AutopilotMode): boolean {
  return mode === TAKE_CONTROL_MODE;
}

/** The mode a click on the control button asks for. */
export function nextControlMode(mode: AutopilotMode): AutopilotMode {
  return isPlumberInControl(mode) ? GIVE_BACK_MODE : TAKE_CONTROL_MODE;
}

/**
 * Limits of the pilot settings (API.md 20.2, FieldLimits of the backend). GET /meta/constraints
 * does not publish them yet, so they are the contract's numbers; the server checks them again.
 */
export const OPERATOR_ABSENCE_MINUTES_LIMITS = { min: 1, max: 1440 } as const;
export const RESERVE_FLOOR_PCT_LIMITS = { min: 0, max: 100 } as const;

export type SettingsFieldError = 'absence' | 'floor';

function inRange(value: number, limits: { readonly min: number; readonly max: number }): boolean {
  return Number.isFinite(value) && value >= limits.min && value <= limits.max;
}

/** Which fields of the pilot settings are out of range; the absence is a whole number of minutes. */
export function settingsErrors(input: {
  readonly operatorAbsenceMinutes: number;
  readonly reserveFloorPct: number;
}): readonly SettingsFieldError[] {
  const errors: SettingsFieldError[] = [];
  if (
    !Number.isInteger(input.operatorAbsenceMinutes) ||
    !inRange(input.operatorAbsenceMinutes, OPERATOR_ABSENCE_MINUTES_LIMITS)
  ) {
    errors.push('absence');
  }
  if (!inRange(input.reserveFloorPct, RESERVE_FLOOR_PCT_LIMITS)) {
    errors.push('floor');
  }
  return errors;
}

/** Statuses that mean the decision was settled, one way or another (the history marks them). */
export function isSettled(status: DecisionStatus): boolean {
  return status !== 'PENDING';
}
