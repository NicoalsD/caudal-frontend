import { describe, expect, it } from 'vitest';

import { describeLastSeen } from './lastSeen';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const HOUR = 3_600_000;
const SECOND = 1000;
const THREE_HOURS = 3;
const HALF = 2;

describe('describeLastSeen', () => {
  it('says never when the device has not reported', () => {
    expect(describeLastSeen(null, NOW)).toEqual({ kind: 'never' });
  });

  it('counts whole hours since the last message', () => {
    expect(describeLastSeen(NOW - THREE_HOURS * HOUR - SECOND, NOW)).toEqual({
      kind: 'hours',
      hours: THREE_HOURS,
    });
  });

  it('says recent under one hour', () => {
    expect(describeLastSeen(NOW - HOUR / HALF, NOW)).toEqual({ kind: 'recent' });
  });

  it('treats a message from the future as recent', () => {
    expect(describeLastSeen(NOW + HOUR, NOW)).toEqual({ kind: 'recent' });
  });
});
