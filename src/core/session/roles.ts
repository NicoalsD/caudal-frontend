/** System roles (facts section 9). Source of truth for role names used by guards and layouts. */
export const ROLES = [
  'BOARD_ADMIN',
  'BOARD_MEMBER',
  'INSTITUTION_ADMIN',
  'OPERATOR',
  'PROJECT_TEAM',
  'SUPPORT_ENTITY',
  'VIEWER',
] as const;

export type Role = (typeof ROLES)[number];

/** Roles that administer the institution: they see the same admin screens (INSTITUTION_ADMIN is the new name of the Board's administrator). */
export const ADMIN_ROLES = ['BOARD_ADMIN', 'INSTITUTION_ADMIN'] as const satisfies readonly Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** True for the roles that get the admin screens (users, entities, regions, devices, audit, evaluation). */
export function isAdminRole(role: Role): boolean {
  return (ADMIN_ROLES as readonly Role[]).includes(role);
}
