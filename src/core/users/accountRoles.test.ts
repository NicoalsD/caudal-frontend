import { describe, expect, it } from 'vitest';

import { type AccountRole, currentRoleByUser, isAccountRoleCurrent } from './accountRoles';

const NOW = 1_000;

function role(overrides: Partial<AccountRole>): AccountRole {
  return {
    membershipId: 'm-1',
    userId: 'u-1',
    roleCode: 'OPERATOR',
    validFromMs: 0,
    validToMs: null,
    ...overrides,
  };
}

describe('isAccountRoleCurrent', () => {
  it('is current from its start while it has no end', () => {
    expect(isAccountRoleCurrent(role({ validFromMs: NOW }), NOW)).toBe(true);
  });

  it('is not current before it starts', () => {
    expect(isAccountRoleCurrent(role({ validFromMs: NOW + 1 }), NOW)).toBe(false);
  });

  it('is not current from its end on (the end is exclusive)', () => {
    expect(isAccountRoleCurrent(role({ validToMs: NOW }), NOW)).toBe(false);
    expect(isAccountRoleCurrent(role({ validToMs: NOW + 1 }), NOW)).toBe(true);
  });
});

describe('currentRoleByUser', () => {
  it('keeps the current role of each account and drops ended ones', () => {
    const roles = [
      role({ membershipId: 'old', userId: 'u-1', validToMs: NOW - 1 }),
      role({ membershipId: 'now', userId: 'u-1', roleCode: 'BOARD_MEMBER' }),
      role({ membershipId: 'other', userId: 'u-2', roleCode: 'PROJECT_TEAM' }),
    ];
    const current = currentRoleByUser(roles, NOW);
    expect(current.get('u-1')?.membershipId).toBe('now');
    expect(current.get('u-2')?.roleCode).toBe('PROJECT_TEAM');
    expect(current.size).toBe(roles.length - 1);
  });

  it('has no entry for an account without a current role', () => {
    expect(currentRoleByUser([role({ validToMs: 1 })], NOW).has('u-1')).toBe(false);
  });
});
