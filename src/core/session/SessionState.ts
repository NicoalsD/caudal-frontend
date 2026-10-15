import type { MembershipChoice } from './memberships';
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
  /** The server answered PRIVACY_NOTICE_PENDING: only the privacy notice screen is open. */
  readonly privacyNoticePending?: boolean;
  /** Permission codes from GET /auth/me, used only to show or hide actions. */
  readonly permissions: readonly string[];
  /** Where the person can work (current memberships), to offer a change of aqueduct. */
  readonly memberships: readonly MembershipChoice[];
}

export type SessionState =
  /** The app just started and is asking the server whether the refresh cookie is still good. */
  | { readonly status: 'restoring' }
  | { readonly status: 'anonymous'; readonly reason?: 'offline' | 'password-changed' }
  | { readonly status: 'authenticated'; readonly user: SessionUser }
  | { readonly status: 'expired' };
