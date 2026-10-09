import type { Role } from './roles';

/** Minimal user data kept in memory for UX decisions. The server always authorizes. */
export interface SessionUser {
  readonly userId: string;
  readonly username: string;
  readonly role: Role;
  readonly aqueductId: string;
  readonly displayName: string;
  /** The server answered `must_change_password`: only the change-password screen is open. */
  readonly mustChangePassword: boolean;
}

export type SessionState =
  | { readonly status: 'anonymous' }
  | { readonly status: 'authenticated'; readonly user: SessionUser }
  | { readonly status: 'expired' };
