import type { components } from '../../services/api/schema';

export type AuthUserDto = components['schemas']['AuthUser'];
export type MeResponseDto = components['schemas']['MeResponse'];
export type LoginResponseDto = components['schemas']['LoginResponse'];

export const TEST_AQUEDUCT_ID = '0190f3a2-0000-7000-8000-0000000000aa';
export const OTHER_AQUEDUCT_ID = '0190f3a2-0000-7000-8000-0000000000bb';
/** Fake password for tests only. */
export const TEST_PASSWORD = 'contrasena-de-prueba-larga';
export const TEST_NEW_PASSWORD = 'otra-contrasena-de-prueba-larga';
export const ACCESS_TOKEN_SECONDS = 900;

export const TEST_USERS = {
  operator: {
    id: '0190f3a2-0000-7000-8000-000000000001',
    username: 'fontanero.ejemplo',
    full_name: 'Persona Fontanera',
    role: 'OPERATOR',
    aqueduct_id: TEST_AQUEDUCT_ID,
    must_change_password: false,
  },
  admin: {
    id: '0190f3a2-0000-7000-8000-000000000002',
    username: 'junta.presidencia',
    full_name: 'Persona Presidente',
    role: 'BOARD_ADMIN',
    aqueduct_id: TEST_AQUEDUCT_ID,
    must_change_password: false,
  },
  member: {
    id: '0190f3a2-0000-7000-8000-000000000003',
    username: 'junta.vocal',
    full_name: 'Persona Vocal',
    role: 'BOARD_MEMBER',
    aqueduct_id: TEST_AQUEDUCT_ID,
    must_change_password: false,
  },
  /** Works in two aqueducts: administrator in the first, operator in the second. */
  multi: {
    id: '0190f3a2-0000-7000-8000-000000000005',
    username: 'persona.dos.acueductos',
    full_name: 'Persona Dos Acueductos',
    role: 'BOARD_ADMIN',
    aqueduct_id: TEST_AQUEDUCT_ID,
    must_change_password: false,
  },
  newcomer: {
    id: '0190f3a2-0000-7000-8000-000000000004',
    username: 'fontanero.nuevo',
    full_name: 'Persona Nueva',
    role: 'OPERATOR',
    aqueduct_id: TEST_AQUEDUCT_ID,
    must_change_password: true,
  },
} as const satisfies Record<string, AuthUserDto>;

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** An unsigned JWT-shaped string with the claims the client reads (role, aqueduct_id). */
export function makeAccessToken(user: AuthUserDto, serial = 1): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({ sub: user.id, role: user.role, aqueduct_id: user.aqueduct_id, serial }),
  );
  return `${header}.${payload}.firma-de-prueba`;
}

export function buildLoginResponse(user: AuthUserDto, serial = 1): LoginResponseDto {
  return {
    access_token: makeAccessToken(user, serial),
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_SECONDS,
    user,
  };
}

const BOARD_PERMISSIONS = ['NETWORK_VIEW', 'RULESET_VIEW', 'RULESET_DRAFT', 'STATUS_VIEW'] as const;

/** Permission codes by role, as in Actores-y-permisos.md section 3.3 (the ones the screens use). */
export const PERMISSIONS_BY_ROLE: Record<AuthUserDto['role'], readonly string[]> = {
  BOARD_ADMIN: [...BOARD_PERMISSIONS, 'RULESET_ACTIVATE', 'NETWORK_MANAGE', 'USER_MANAGE'],
  BOARD_MEMBER: BOARD_PERMISSIONS,
  OPERATOR: ['NETWORK_VIEW', 'RULESET_VIEW', 'READING_CREATE', 'DAY_CLOSE', 'STATUS_VIEW'],
  PROJECT_TEAM: ['NETWORK_VIEW', 'RULESET_VIEW', 'EVALUATION_VIEW'],
  SUPPORT_ENTITY: ['SUMMARY_VIEW'],
};

export type MembershipDto = components['schemas']['Membership'];

export function buildMeResponse(
  user: AuthUserDto,
  memberships: MembershipDto[] = [{ aqueduct_id: user.aqueduct_id, role: user.role }],
): MeResponseDto {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    must_change_password: user.must_change_password,
    memberships,
    permissions: [...PERMISSIONS_BY_ROLE[user.role]],
  };
}

export function findTestUser(predicate: (user: AuthUserDto) => boolean): AuthUserDto | undefined {
  return Object.values<AuthUserDto>(TEST_USERS).find(predicate);
}
