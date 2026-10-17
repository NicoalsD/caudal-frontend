/** System roles (facts section 9). Source of truth for role names used by guards and layouts. */
export const ROLES = [
  'BOARD_ADMIN',
  'BOARD_MEMBER',
  'OPERATOR',
  'PROJECT_TEAM',
  'SUPPORT_ENTITY',
] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
