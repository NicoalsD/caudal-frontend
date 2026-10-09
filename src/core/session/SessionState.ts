import type { Role } from './roles';

/** Minimal user data kept in memory for UX decisions. The server always authorizes. */
export interface SessionUser {
  readonly userId: string;
  readonly role: Role;
  readonly aqueductId: string;
  readonly displayName: string;
}

export type SessionState =
  | { readonly status: 'anonymous' }
  | { readonly status: 'authenticated'; readonly user: SessionUser }
  | { readonly status: 'expired' };
