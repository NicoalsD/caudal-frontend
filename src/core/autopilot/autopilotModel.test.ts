import { describe, expect, it } from 'vitest';

import { isPlumberInControl, nextControlMode } from './autopilotModel';

describe('autopilotModel', () => {
  it('takes control to MANUAL and gives it back to AUTOMATIC', () => {
    expect(nextControlMode('ASSISTED')).toBe('MANUAL');
    expect(nextControlMode('AUTOMATIC')).toBe('MANUAL');
    expect(nextControlMode('MANUAL')).toBe('AUTOMATIC');
  });

  it('says the person drives only in MANUAL', () => {
    expect(isPlumberInControl('MANUAL')).toBe(true);
    expect(isPlumberInControl('ASSISTED')).toBe(false);
  });
});
