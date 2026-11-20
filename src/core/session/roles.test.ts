import { describe, expect, it } from 'vitest';

import { isRole, ROLES } from './roles';

describe('isRole', () => {
  it('accepts every declared role', () => {
    for (const role of ROLES) {
      expect(isRole(role)).toBe(true);
    }
  });

  it('rejects unknown values and non-strings', () => {
    expect(isRole('ADMIN')).toBe(false);
    expect(isRole('operator')).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(null)).toBe(false);
  });
});
