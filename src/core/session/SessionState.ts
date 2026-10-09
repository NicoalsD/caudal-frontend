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
  /** Permission codes from GET /auth/me, used only to show or hide actions. */
  readonly permissions: readonly string[];
}

export type SessionState =
  /** The app just started and is asking the server whether the refresh cookie is still good. */
  | { readonly status: 'restoring' }
  | { readonly status: 'anonymous'; readonly reason?: 'offline' }
  | { readonly status: 'authenticated'; readonly user: SessionUser }
  | { readonly status: 'expired' };
