import { toBogotaIso, windowsForDay, type MinuteWindow } from './proposalTime';
import type { OperatingWindow } from '../rules/ruleSetParts';

/**
 * Mediator of the proposal editor (P15). The sliders, the numeric fields, the reason and the
 * submit button do not talk to each other: they call this object and read its state. All the
 * rules of an edit live here, so they are checked once and in one place.
 */

const MINUTES_PER_HOUR = 60;
/** Smallest change the editor makes with a slider or a button. */
export const HOURS_STEP = 0.5;
const ZERO = 0;
const NOT_FOUND = -1;

export interface EditorShiftInput {
  readonly sectorId: string;
  /** Hours of the shift as the proposal has them now. */
  readonly hours: number;
}

/** Limits that come from the server: the day's hours (proposal) and the rule set (rules). */
export interface EditorLimits {
  /** Hours of service of the day (`available_hours` of the proposal). */
  readonly availableHours: number;
  /** From /rule-sets/current. */
  readonly minShiftHours: number;
  readonly maxShiftHours: number;
  /** Operating windows of the rule set (all of them: the mediator keeps the ones of the day). */
  readonly operatingWindows: readonly OperatingWindow[];
  /** From /meta/constraints, key "reason". */
  readonly reasonMin: number;
  readonly reasonMax: number;
}

export interface ProposalEditorInput {
  /** Day of service, YYYY-MM-DD. */
  readonly serviceDate: string;
  /** Start of the first shift, in minutes from midnight (America/Bogota). */
  readonly startMinutes: number;
  /** Shifts in sequence order. Each one starts when the one before it ends. */
  readonly shifts: readonly EditorShiftInput[];
  readonly limits: EditorLimits;
}

export type ShiftIssueCode = 'SHIFT_BELOW_MIN' | 'SHIFT_ABOVE_MAX' | 'OUTSIDE_WINDOW';

export type EditorErrorCode = 'TOTAL_EXCEEDS_AVAILABLE';

export type ReasonIssueCode = 'REASON_REQUIRED' | 'REASON_TOO_SHORT' | 'REASON_TOO_LONG';

export interface ShiftEditorState {
  readonly sectorId: string;
  readonly hours: number;
  readonly originalHours: number;
  readonly startMinutes: number;
  readonly endMinutes: number;
  readonly issues: readonly ShiftIssueCode[];
}

export interface EditorState {
  readonly shifts: readonly ShiftEditorState[];
  readonly totalHours: number;
  readonly availableHours: number;
  readonly reason: string;
  readonly reasonIssue: ReasonIssueCode | null;
  readonly errors: readonly EditorErrorCode[];
  readonly changed: boolean;
  readonly canSubmit: boolean;
}

/** One item of `POST /schedule-proposals/{id}/modify`, with its times in ISO-8601. */
export interface EditedShift {
  readonly sectorId: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly sequence: number;
}

export type EditorListener = () => void;

/** Checks the reason text against its limits. The minimum ignores spaces at the ends. */
export function reasonIssueOf(
  reason: string,
  limits: Pick<EditorLimits, 'reasonMin' | 'reasonMax'>,
): ReasonIssueCode | null {
  const trimmed = reason.trim();
  if (trimmed.length === ZERO) {
    return 'REASON_REQUIRED';
  }
  if (trimmed.length < limits.reasonMin) {
    return 'REASON_TOO_SHORT';
  }
  if (reason.length > limits.reasonMax) {
    return 'REASON_TOO_LONG';
  }
  return null;
}

export class ProposalEditorMediator {
  private readonly original: readonly EditorShiftInput[];
  private hours: number[];
  private reason = '';
  private readonly windows: readonly MinuteWindow[];
  private cached: EditorState;
  private readonly listeners = new Set<EditorListener>();

  constructor(private readonly input: ProposalEditorInput) {
    this.original = input.shifts;
    this.hours = input.shifts.map((shift) => shift.hours);
    this.windows = windowsForDay(input.limits.operatingWindows, input.serviceDate);
    this.cached = this.compute();
  }

  /** The current state. The same object is returned until something changes. */
  getState(): EditorState {
    return this.cached;
  }

  /** Registers a listener; returns the function that removes it (for useSyncExternalStore). */
  subscribe(listener: EditorListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setHours(sectorId: string, hours: number): void {
    const index = this.original.findIndex((shift) => shift.sectorId === sectorId);
    if (index === NOT_FOUND || !Number.isFinite(hours)) {
      return;
    }
    const next = Math.max(ZERO, hours);
    if (this.hours[index] === next) {
      return;
    }
    this.hours = this.hours.map((value, position) => (position === index ? next : value));
    this.publish();
  }

  setReason(reason: string): void {
    if (this.reason === reason) {
      return;
    }
    this.reason = reason;
    this.publish();
  }

  /**
   * The items for POST /schedule-proposals/{id}/modify, with ISO-8601 times in America/Bogota.
   * Only meaningful when `canSubmit` is true; the server checks everything again.
   */
  toEditedShifts(): readonly EditedShift[] {
    return this.cached.shifts.map((shift, index) => ({
      sectorId: shift.sectorId,
      startAt: toBogotaIso(this.input.serviceDate, shift.startMinutes),
      endAt: toBogotaIso(this.input.serviceDate, shift.endMinutes),
      sequence: index,
    }));
  }

  private publish(): void {
    this.cached = this.compute();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private compute(): EditorState {
    const { limits } = this.input;
    let cursor = this.input.startMinutes;
    const shifts: ShiftEditorState[] = this.original.map((shift, index) => {
      const hours = this.hours[index] ?? ZERO;
      const startMinutes = cursor;
      const endMinutes = startMinutes + Math.round(hours * MINUTES_PER_HOUR);
      cursor = endMinutes;
      return {
        sectorId: shift.sectorId,
        hours,
        originalHours: shift.hours,
        startMinutes,
        endMinutes,
        issues: this.issuesOf(hours, startMinutes, endMinutes),
      };
    });
    const totalHours = shifts.reduce((sum, shift) => sum + shift.hours, ZERO);
    const errors: EditorErrorCode[] =
      totalHours > limits.availableHours ? ['TOTAL_EXCEEDS_AVAILABLE'] : [];
    const reasonIssue = reasonIssueOf(this.reason, limits);
    const changed = shifts.some((shift) => shift.hours !== shift.originalHours);
    const hasShiftIssue = shifts.some((shift) => shift.issues.length > ZERO);
    return {
      shifts,
      totalHours,
      availableHours: limits.availableHours,
      reason: this.reason,
      reasonIssue,
      errors,
      changed,
      canSubmit: changed && errors.length === ZERO && reasonIssue === null && !hasShiftIssue,
    };
  }

  private issuesOf(hours: number, startMinutes: number, endMinutes: number): ShiftIssueCode[] {
    const { limits } = this.input;
    const issues: ShiftIssueCode[] = [];
    if (hours < limits.minShiftHours) {
      issues.push('SHIFT_BELOW_MIN');
    }
    if (hours > limits.maxShiftHours) {
      issues.push('SHIFT_ABOVE_MAX');
    }
    const fits = this.windows.some(
      (window) => startMinutes >= window.startMinutes && endMinutes <= window.endMinutes,
    );
    if (!fits) {
      issues.push('OUTSIDE_WINDOW');
    }
    return issues;
  }
}
