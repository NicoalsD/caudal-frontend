import { describe, expect, it } from 'vitest';

import { SubmitReadingCommand, readSubmitReadingPayload } from './SubmitReadingCommand';

describe('SubmitReadingCommand', () => {
  it('keeps the client id as idempotency key and the frozen payload', () => {
    const payload = {
      tankId: 't-1',
      gaugeValue: 2.1,
      waterAppearanceCode: 'NORMAL',
      damageNoticed: false,
      note: '',
      observedAt: '2026-10-14T08:00:00.000Z',
    };
    const command = new SubmitReadingCommand('c-1', payload);

    expect(command.kind).toBe('SUBMIT_READING');
    expect(command.clientId).toBe('c-1');
    expect(command.payload).toEqual(payload);
  });
});

describe('readSubmitReadingPayload', () => {
  const VALID = {
    tankId: 't-1',
    gaugeValue: 2.1,
    waterAppearanceCode: 'NORMAL',
    damageNoticed: true,
    note: 'Llovió',
    observedAt: '2026-10-14T08:00:00.000Z',
  };

  it('returns the payload when every field has its shape', () => {
    expect(readSubmitReadingPayload(VALID)).toEqual(VALID);
  });

  it('returns null for data that is not a reading', () => {
    expect(readSubmitReadingPayload(null)).toBeNull();
    expect(readSubmitReadingPayload('texto')).toBeNull();
    expect(readSubmitReadingPayload({ ...VALID, gaugeValue: Number.NaN })).toBeNull();
    expect(readSubmitReadingPayload({ ...VALID, damageNoticed: 'no' })).toBeNull();
    expect(readSubmitReadingPayload({ ...VALID, observedAt: undefined })).toBeNull();
  });
});
