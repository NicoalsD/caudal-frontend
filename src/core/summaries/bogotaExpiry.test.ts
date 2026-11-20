import { describe, expect, it } from 'vitest';

import { bogotaLocalToIso } from './bogotaExpiry';

describe('bogotaLocalToIso', () => {
  it('adds the seconds and the America/Bogota offset', () => {
    expect(bogotaLocalToIso('2026-11-30T23:59')).toBe('2026-11-30T23:59:00-05:00');
  });

  it('ignores surrounding spaces', () => {
    expect(bogotaLocalToIso(' 2026-01-05T08:00 ')).toBe('2026-01-05T08:00:00-05:00');
  });

  it('returns null for an incomplete value', () => {
    expect(bogotaLocalToIso('')).toBeNull();
    expect(bogotaLocalToIso('2026-11-30')).toBeNull();
    expect(bogotaLocalToIso('2026-11-30 23:59')).toBeNull();
  });
});
