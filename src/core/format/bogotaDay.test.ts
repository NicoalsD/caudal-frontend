import { describe, expect, it } from 'vitest';

import { bogotaDayEnd, bogotaDayStart } from './bogotaDay';

describe('bogotaDayStart and bogotaDayEnd', () => {
  it('give the first and the last second of the day with the Bogota offset', () => {
    expect(bogotaDayStart('2026-10-01')).toBe('2026-10-01T00:00:00-05:00');
    expect(bogotaDayEnd('2026-10-31')).toBe('2026-10-31T23:59:59-05:00');
  });

  it('return null for a value that is not a calendar day', () => {
    expect(bogotaDayStart('01/10/2026')).toBeNull();
    expect(bogotaDayEnd('')).toBeNull();
  });
});
