import type { Role } from './roles';

/** A membership as the server lists it: a role in one aqueduct during a period. */
export interface Membership {
  readonly aqueductId: string;
  readonly role: Role;
  /** Epoch milliseconds, or null when it has no start / no end. */
  readonly validFromMs: number | null;
  readonly validToMs: number | null;
}

/** The part of a membership the screens need: where the person can work and as what. */
export interface MembershipChoice {
  readonly aqueductId: string;
  readonly role: Role;
}

/** True when `nowMs` is inside the period. The server still checks it on every call. */
export function isMembershipCurrent(membership: Membership, nowMs: number): boolean {
  const started = membership.validFromMs === null || membership.validFromMs <= nowMs;
  const notEnded = membership.validToMs === null || nowMs < membership.validToMs;
  return started && notEnded;
}

export function currentMembershipChoices(
  memberships: readonly Membership[],
  nowMs: number,
): MembershipChoice[] {
  return memberships
    .filter((membership) => isMembershipCurrent(membership, nowMs))
    .map(({ aqueductId, role }) => ({ aqueductId, role }));
}
