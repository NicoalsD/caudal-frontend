/** What the plumber's screens know about a valve in the field and the commands sent to it. */

export const VALVE_STATES = ['OPEN', 'CLOSED', 'UNKNOWN'] as const;
export type ValveState = (typeof VALVE_STATES)[number];

export const VALVE_ACTIONS = ['OPEN', 'CLOSE'] as const;
export type ValveAction = (typeof VALVE_ACTIONS)[number];

export const COMMAND_STATUSES = ['PENDING', 'DELIVERED', 'ACKED', 'FAILED', 'EXPIRED'] as const;
export type CommandStatus = (typeof COMMAND_STATUSES)[number];

export const COMMAND_ORIGINS = ['SCHEDULE', 'MANUAL', 'AUTOPILOT'] as const;
export type CommandOrigin = (typeof COMMAND_ORIGINS)[number];

/** A command that has not reached its end: the valve may still move. */
export function isCommandInFlight(status: CommandStatus): boolean {
  return status === 'PENDING' || status === 'DELIVERED';
}

/** The action that moves a valve away from its state; null when the state is not known. */
export function oppositeAction(state: ValveState): ValveAction | null {
  if (state === 'OPEN') {
    return 'CLOSE';
  }
  return state === 'CLOSED' ? 'OPEN' : null;
}
