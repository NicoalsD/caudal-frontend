import type { ReportStatus } from './reportStatus';

/** A status a Board member can move a report to (API.md 12.3). "REPORTED" is only the start. */
export type IncidentTarget = Exclude<ReportStatus, 'REPORTED'>;

/**
 * Where each status may go (Reglas-de-negocio.md section 15). The server decides again and answers
 * 409 INVALID_STATE_TRANSITION; this table only keeps the screen from offering the impossible.
 */
const TARGETS_BY_STATUS: Readonly<Record<ReportStatus, readonly IncidentTarget[]>> = {
  REPORTED: ['VERIFYING', 'DISMISSED'],
  VERIFYING: ['CONFIRMED', 'DISMISSED'],
  CONFIRMED: ['RESOLVED'],
  RESOLVED: [],
  DISMISSED: [],
};

/** Targets that need a note of 10 to 500 characters (API.md 12.3). */
const TARGETS_WITH_NOTE: ReadonlySet<IncidentTarget> = new Set<IncidentTarget>(['DISMISSED']);

/** The dismissal is never the main action of an item: it is always the secondary one. */
const DISMISSAL: IncidentTarget = 'DISMISSED';

/**
 * Transitions of an incident. Each status knows the statuses it can reach, so a screen asks
 * "what can I do now?" instead of repeating the rules.
 *
 * @pattern P18 State (the table is the state's transitions)
 */
export class IncidentTransitions {
  allowedFrom(status: ReportStatus): readonly IncidentTarget[] {
    return TARGETS_BY_STATUS[status];
  }

  canMove(from: ReportStatus, to: IncidentTarget): boolean {
    return this.allowedFrom(from).includes(to);
  }

  requiresNote(target: IncidentTarget): boolean {
    return TARGETS_WITH_NOTE.has(target);
  }

  /** The one main action of an item: the next step forward, or null when there is none. */
  primaryFrom(status: ReportStatus): IncidentTarget | null {
    return this.allowedFrom(status).find((target) => target !== DISMISSAL) ?? null;
  }
}
