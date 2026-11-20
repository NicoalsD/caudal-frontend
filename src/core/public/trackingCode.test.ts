import { describe, expect, it } from 'vitest';

import { normalizeTrackingCodeInput } from './trackingCode';

describe('normalizeTrackingCodeInput', () => {
  it('uppercases the code', () => {
    expect(normalizeTrackingCodeInput('7k2m9qaz')).toBe('7K2M9QAZ');
  });

  it('drops spaces and hyphens typed between the characters', () => {
    expect(normalizeTrackingCodeInput('7K2M 9QAZ')).toBe('7K2M9QAZ');
    expect(normalizeTrackingCodeInput('7k2m-9qaz')).toBe('7K2M9QAZ');
  });

  it('leaves an empty text empty', () => {
    expect(normalizeTrackingCodeInput('   ')).toBe('');
  });
});
