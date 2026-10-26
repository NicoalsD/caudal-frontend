import { describe, expect, it } from 'vitest';

import { currentMembershipChoices, isMembershipCurrent } from './memberships';
import type { Membership } from './memberships';

const NOW = 1_000;
const BEFORE = 500;
const AFTER = 2_000;

const base: Membership = {
  aqueductId: 'a-1',
  role: 'OPERATOR',
  validFromMs: null,
  validToMs: null,
};

describe('isMembershipCurrent', () => {
  it('accepts a membership without dates', () => {
    expect(isMembershipCurrent(base, NOW)).toBe(true);
  });

  it('includes the start and excludes the end', () => {
    expect(isMembershipCurrent({ ...base, validFromMs: NOW }, NOW)).toBe(true);
    expect(isMembershipCurrent({ ...base, validToMs: NOW }, NOW)).toBe(false);
  });

  it('rejects one that has not started or already ended', () => {
    expect(isMembershipCurrent({ ...base, validFromMs: AFTER }, NOW)).toBe(false);
    expect(isMembershipCurrent({ ...base, validToMs: BEFORE }, NOW)).toBe(false);
  });
});

describe('currentMembershipChoices', () => {
  it('keeps only the current ones and drops the dates', () => {
    const list: Membership[] = [
      base,
      { ...base, aqueductId: 'a-2', role: 'BOARD_ADMIN', validToMs: BEFORE },
      { ...base, aqueductId: 'a-3', role: 'BOARD_MEMBER', validFromMs: BEFORE, validToMs: AFTER },
    ];

    expect(currentMembershipChoices(list, NOW)).toEqual([
      { aqueductId: 'a-1', role: 'OPERATOR' },
      { aqueductId: 'a-3', role: 'BOARD_MEMBER' },
    ]);
  });
});
