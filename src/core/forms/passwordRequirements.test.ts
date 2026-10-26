import { describe, expect, it } from 'vitest';

import { passwordRequirements } from './passwordRequirements';

const LIMITS = { min: 12, max: 20 };
const BASE = { current: 'clave-actual', username: 'Junta.Uno', ...LIMITS };

const metKeys = (value: string) =>
  passwordRequirements({ ...BASE, value })
    .filter((requirement) => requirement.met)
    .map((requirement) => requirement.key);

describe('passwordRequirements', () => {
  it('marks nothing as met for an empty field', () => {
    expect(metKeys('')).toEqual([]);
  });

  it('meets everything for a good password', () => {
    expect(metKeys('una-clave-larga-1')).toEqual(['length', 'notUsername', 'differentFromCurrent']);
  });

  it('checks the length range with the limits it receives', () => {
    expect(metKeys('a'.repeat(LIMITS.min - 1))).not.toContain('length');
    expect(metKeys('a'.repeat(LIMITS.min))).toContain('length');
    expect(metKeys('a'.repeat(LIMITS.max))).toContain('length');
    expect(metKeys('a'.repeat(LIMITS.max + 1))).not.toContain('length');
  });

  it('detects the username inside the password, ignoring case', () => {
    expect(metKeys('xx-JUNTA.uno-xx')).not.toContain('notUsername');
  });

  it('detects a password equal to the current one', () => {
    expect(metKeys(BASE.current)).not.toContain('differentFromCurrent');
  });

  it('does not fail the username rule when there is no username', () => {
    const result = passwordRequirements({ ...BASE, username: '', value: 'cualquier-cosa-larga' });

    expect(result.find((requirement) => requirement.key === 'notUsername')?.met).toBe(true);
  });
});
