import { describe, expect, it } from 'vitest';

import { isCommandInFlight, oppositeAction } from './valveModel';

describe('valveModel', () => {
  it('treats PENDING and DELIVERED as in flight', () => {
    expect(isCommandInFlight('PENDING')).toBe(true);
    expect(isCommandInFlight('DELIVERED')).toBe(true);
    expect(isCommandInFlight('ACKED')).toBe(false);
    expect(isCommandInFlight('FAILED')).toBe(false);
    expect(isCommandInFlight('EXPIRED')).toBe(false);
  });

  it('proposes the action that moves the valve away from its state', () => {
    expect(oppositeAction('OPEN')).toBe('CLOSE');
    expect(oppositeAction('CLOSED')).toBe('OPEN');
    expect(oppositeAction('UNKNOWN')).toBeNull();
  });
});
