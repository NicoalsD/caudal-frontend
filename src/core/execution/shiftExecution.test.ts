import { describe, expect, it } from 'vitest';

import { toExecutionTimes } from './shiftExecution';

const DAY = '2026-10-10';

describe('toExecutionTimes', () => {
  it('sends no times for a shift completed as planned', () => {
    expect(toExecutionTimes(DAY, { status: 'COMPLETED', startTime: '', endTime: '' })).toEqual({
      ok: true,
      actualStart: null,
      actualEnd: null,
    });
  });

  it('sends no times for a shift not executed, even if times were typed', () => {
    expect(
      toExecutionTimes(DAY, { status: 'NOT_EXECUTED', startTime: '08:00', endTime: '09:00' }),
    ).toEqual({ ok: true, actualStart: null, actualEnd: null });
  });

  it('turns a partial shift with start and end into instants in Bogota time', () => {
    expect(
      toExecutionTimes(DAY, { status: 'PARTIAL', startTime: '08:00', endTime: '09:30' }),
    ).toEqual({
      ok: true,
      actualStart: '2026-10-10T08:00:00-05:00',
      actualEnd: '2026-10-10T09:30:00-05:00',
    });
  });

  it('accepts a partial shift with only the start', () => {
    expect(toExecutionTimes(DAY, { status: 'PARTIAL', startTime: '08:00', endTime: '' })).toEqual({
      ok: true,
      actualStart: '2026-10-10T08:00:00-05:00',
      actualEnd: null,
    });
  });

  it('requires the start of a partial shift', () => {
    expect(toExecutionTimes(DAY, { status: 'PARTIAL', startTime: '', endTime: '09:00' })).toEqual({
      ok: false,
      error: 'START_REQUIRED',
      field: 'startTime',
    });
  });

  it('refuses an end that is not after the start', () => {
    expect(
      toExecutionTimes(DAY, { status: 'PARTIAL', startTime: '09:00', endTime: '09:00' }),
    ).toEqual({ ok: false, error: 'END_NOT_AFTER_START', field: 'endTime' });
  });

  it('refuses a time that is not HH:mm', () => {
    expect(toExecutionTimes(DAY, { status: 'PARTIAL', startTime: '25:00', endTime: '' })).toEqual({
      ok: false,
      error: 'TIME_INVALID',
      field: 'startTime',
    });
  });
});
