import type { SessionUser } from '../../core/session/SessionState';

/** A signed-in person for tests that start with a session already in memory. */
export function buildSessionUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    userId: '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a81',
    username: 'persona.prueba',
    role: 'OPERATOR',
    aqueductId: '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a82',
    displayName: 'Persona de prueba',
    mustChangePassword: false,
    permissions: [],
    ...overrides,
  };
}
