import { describe, expect, it } from 'vitest';

import type { OperatingWindow } from '../rules/ruleSetParts';
import {
  ProposalEditorMediator,
  reasonIssueOf,
  type EditorLimits,
  type ProposalEditorInput,
} from './ProposalEditorMediator';

const DAY = '2026-10-09';
const SCHOOL = 'sector-escuela';
const HIGH = 'sector-alto';
const LOW = 'sector-bajo';
const VALID_REASON = 'Se pidió dejar una hora más al sector alto.';
const REASON_MIN = 10;
const REASON_MAX = 500;
const MINUTES = 60;
const EIGHT = 8;
const SIX = 6;
const TWENTY_ONE = 21;
const EIGHT_AM = EIGHT * MINUTES;
const SIX_AM = SIX * MINUTES;
const NINE_PM = TWENTY_ONE * MINUTES;
const AVAILABLE = 16;
const MIN_SHIFT = 1;
const MAX_SHIFT = 8;
const SCHOOL_HOURS = 3;
const HIGH_HOURS = 8;
const LOW_HOURS = 5;
const SHORT_HOURS = 4;
const HALF_HOUR = 0.5;
const OVER_MAX = 9;
const TWO = 2;
const MONDAY = 1;
const SUNDAY = 7;
const THREE = 3;
const ONE_OVER = 1;
const NEGATIVE = -4;
const TOTAL_OVER = 17;
const ONE_HOUR_MORE = 6;

const EVERY_DAY: OperatingWindow[] = [{ dayOfWeek: null, start: '05:00', end: '21:00' }];

function limits(overrides: Partial<EditorLimits> = {}): EditorLimits {
  return {
    availableHours: AVAILABLE,
    minShiftHours: MIN_SHIFT,
    maxShiftHours: MAX_SHIFT,
    operatingWindows: EVERY_DAY,
    reasonMin: REASON_MIN,
    reasonMax: REASON_MAX,
    ...overrides,
  };
}

function input(overrides: Partial<ProposalEditorInput> = {}): ProposalEditorInput {
  return {
    serviceDate: DAY,
    startMinutes: SIX_AM,
    shifts: [
      { sectorId: SCHOOL, hours: SCHOOL_HOURS },
      { sectorId: HIGH, hours: HIGH_HOURS },
      { sectorId: LOW, hours: LOW_HOURS },
    ],
    limits: limits(),
    ...overrides,
  };
}

describe('ProposalEditorMediator (P15)', () => {
  it('starts with no change, so it cannot be submitted', () => {
    const mediator = new ProposalEditorMediator(input());
    const state = mediator.getState();
    expect(state.totalHours).toBe(AVAILABLE);
    expect(state.changed).toBe(false);
    expect(state.canSubmit).toBe(false);
    expect(state.errors).toEqual([]);
  });

  it('blocks a total above the available hours', () => {
    const mediator = new ProposalEditorMediator(input());
    mediator.setHours(HIGH, HIGH_HOURS);
    mediator.setHours(LOW, ONE_HOUR_MORE);
    mediator.setReason(VALID_REASON);
    const state = mediator.getState();
    expect(state.totalHours).toBe(TOTAL_OVER);
    expect(state.errors).toEqual(['TOTAL_EXCEEDS_AVAILABLE']);
    expect(state.canSubmit).toBe(false);
  });

  it('blocks a change without a reason, and says why', () => {
    const mediator = new ProposalEditorMediator(input());
    mediator.setHours(LOW, SHORT_HOURS);
    const state = mediator.getState();
    expect(state.changed).toBe(true);
    expect(state.reasonIssue).toBe('REASON_REQUIRED');
    expect(state.canSubmit).toBe(false);
  });

  it('allows the submit once there is a change, a valid reason and no errors', () => {
    const mediator = new ProposalEditorMediator(input());
    mediator.setHours(LOW, SHORT_HOURS);
    mediator.setReason(VALID_REASON);
    expect(mediator.getState().canSubmit).toBe(true);
  });

  it('accepts a reason of exactly the minimum and of exactly the maximum', () => {
    const mediator = new ProposalEditorMediator(input());
    mediator.setHours(LOW, SHORT_HOURS);
    mediator.setReason('x'.repeat(REASON_MIN));
    expect(mediator.getState().reasonIssue).toBeNull();
    mediator.setReason('x'.repeat(REASON_MAX));
    expect(mediator.getState().reasonIssue).toBeNull();
    expect(mediator.getState().canSubmit).toBe(true);
  });

  it('rejects a reason one character over the maximum and one under the minimum', () => {
    const mediator = new ProposalEditorMediator(input());
    mediator.setHours(LOW, SHORT_HOURS);
    mediator.setReason('x'.repeat(REASON_MAX + 1));
    expect(mediator.getState().reasonIssue).toBe('REASON_TOO_LONG');
    mediator.setReason('x'.repeat(REASON_MIN - 1));
    expect(mediator.getState().reasonIssue).toBe('REASON_TOO_SHORT');
    expect(mediator.getState().canSubmit).toBe(false);
  });

  it('flags a shift below the minimum or above the maximum length', () => {
    const mediator = new ProposalEditorMediator(input());
    mediator.setHours(SCHOOL, HALF_HOUR);
    mediator.setHours(HIGH, OVER_MAX);
    const [school, high] = mediator.getState().shifts;
    expect(school?.issues).toEqual(['SHIFT_BELOW_MIN']);
    expect(high?.issues).toEqual(['SHIFT_ABOVE_MAX']);
    mediator.setReason(VALID_REASON);
    expect(mediator.getState().canSubmit).toBe(false);
  });

  it('chains the shifts: a longer shift moves the start of the next one', () => {
    const mediator = new ProposalEditorMediator(input());
    mediator.setHours(SCHOOL, SHORT_HOURS);
    const [school, high] = mediator.getState().shifts;
    expect(school?.startMinutes).toBe(SIX_AM);
    expect(school?.endMinutes).toBe(SIX_AM + SHORT_HOURS * MINUTES);
    expect(high?.startMinutes).toBe(SIX_AM + SHORT_HOURS * MINUTES);
  });

  it('flags a shift that runs outside the operating windows of its day', () => {
    const mediator = new ProposalEditorMediator(
      input({ startMinutes: NINE_PM - TWO * MINUTES, shifts: [{ sectorId: SCHOOL, hours: TWO }] }),
    );
    expect(mediator.getState().shifts[0]?.issues).toEqual([]);
    mediator.setHours(SCHOOL, THREE);
    expect(mediator.getState().shifts[0]?.issues).toEqual(['OUTSIDE_WINDOW']);
  });

  it('uses only the windows of the weekday, and those that apply every day', () => {
    const weekdays: OperatingWindow[] = [
      { dayOfWeek: MONDAY, start: '05:00', end: '12:00' },
      { dayOfWeek: SUNDAY, start: '05:00', end: '21:00' },
    ];
    // 2026-10-09 is a Friday: only the window of Monday is not its window.
    const mediator = new ProposalEditorMediator(
      input({
        startMinutes: EIGHT_AM,
        shifts: [{ sectorId: SCHOOL, hours: TWO }],
        limits: limits({ operatingWindows: weekdays }),
      }),
    );
    expect(mediator.getState().shifts[0]?.issues).toEqual(['OUTSIDE_WINDOW']);
  });

  it('keeps the state object until something changes and notifies listeners', () => {
    const mediator = new ProposalEditorMediator(input());
    const before = mediator.getState();
    expect(mediator.getState()).toBe(before);
    let calls = 0;
    const unsubscribe = mediator.subscribe(() => {
      calls += 1;
    });
    mediator.setHours(SCHOOL, SCHOOL_HOURS);
    expect(calls).toBe(0);
    mediator.setHours(SCHOOL, TWO);
    mediator.setReason(VALID_REASON);
    expect(calls).toBe(TWO);
    unsubscribe();
    mediator.setHours(SCHOOL, ONE_OVER);
    expect(calls).toBe(TWO);
  });

  it('ignores unknown sectors and invalid numbers, and never goes below zero', () => {
    const mediator = new ProposalEditorMediator(input());
    mediator.setHours('desconocido', TWO);
    mediator.setHours(SCHOOL, Number.NaN);
    expect(mediator.getState().changed).toBe(false);
    mediator.setHours(SCHOOL, NEGATIVE);
    expect(mediator.getState().shifts[0]?.hours).toBe(0);
  });

  it('gives the items for modify with ISO times in America/Bogota', () => {
    const mediator = new ProposalEditorMediator(input());
    mediator.setHours(SCHOOL, TWO);
    expect(mediator.toEditedShifts()[0]).toEqual({
      sectorId: SCHOOL,
      startAt: '2026-10-09T06:00:00-05:00',
      endAt: '2026-10-09T08:00:00-05:00',
      sequence: 0,
    });
    expect(mediator.toEditedShifts()[1]?.startAt).toBe('2026-10-09T08:00:00-05:00');
  });
});

describe('reasonIssueOf', () => {
  it('treats spaces only as no reason', () => {
    expect(reasonIssueOf('   ', { reasonMin: REASON_MIN, reasonMax: REASON_MAX })).toBe(
      'REASON_REQUIRED',
    );
  });

  it('accepts a reason with spaces around a valid text', () => {
    expect(
      reasonIssueOf(`  ${VALID_REASON}  `, { reasonMin: REASON_MIN, reasonMax: REASON_MAX }),
    ).toBeNull();
  });
});
