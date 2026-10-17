import type { Role } from '../session/roles';

/** A role of an account, in plain numbers: the part of a membership the Board's list needs. */
export interface AccountRole {
  readonly membershipId: string;
  readonly userId: string;
  readonly roleCode: Role;
  /** Epoch milliseconds of the start of the validity. */
  readonly validFromMs: number;
  /** Epoch milliseconds of the end, or null while the role is open. */
  readonly validToMs: number | null;
}

/** True when `nowMs` is inside the validity of the role (the server still decides). */
export function isAccountRoleCurrent(role: AccountRole, nowMs: number): boolean {
  return role.validFromMs <= nowMs && (role.validToMs === null || nowMs < role.validToMs);
}

/**
 * The role in effect of each account. The server allows one role per account and aqueduct at a
 * time (MEMBERSHIP_OVERLAP), so at most one entry per account is current.
 */
export function currentRoleByUser(
  roles: readonly AccountRole[],
  nowMs: number,
): ReadonlyMap<string, AccountRole> {
  const current = new Map<string, AccountRole>();
  for (const role of roles) {
    if (isAccountRoleCurrent(role, nowMs)) {
      current.set(role.userId, role);
    }
  }
  return current;
}
