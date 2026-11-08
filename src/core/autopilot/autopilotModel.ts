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
