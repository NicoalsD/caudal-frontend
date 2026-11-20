import { describe, expect, it } from 'vitest';

import { attachmentFor, statusTargets } from './deviceModel';

describe('statusTargets', () => {
  it('offers suspend and retire to an active device', () => {
    expect(statusTargets('ACTIVE')).toEqual(['SUSPENDED', 'RETIRED']);
  });

  it('offers activate and retire to a suspended device', () => {
    expect(statusTargets('SUSPENDED')).toEqual(['ACTIVE', 'RETIRED']);
  });

  it('offers nothing for a retired device', () => {
    expect(statusTargets('RETIRED')).toEqual([]);
  });
});

describe('attachmentFor', () => {
  it('asks for a tank for level sensors, a valve for actuators and nothing for gateways', () => {
    expect(attachmentFor('LEVEL_SENSOR')).toBe('tank');
    expect(attachmentFor('VALVE_ACTUATOR')).toBe('valve');
    expect(attachmentFor('GATEWAY')).toBe('none');
  });
});
