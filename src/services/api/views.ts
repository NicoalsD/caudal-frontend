import type { Membership } from '../../core/session/memberships';
import type { Role } from '../../core/session/roles';

/** View models returned by CaudalApi. Components never see the server DTOs. */

export interface HealthView {
  readonly isUp: boolean;
}

/** An instant ready for the screen. */
export interface TimestampView {
  readonly date: Date;
  /** Text in America/Bogota, for example "9 de oct de 2026, 8:00 a. m.". */
  readonly text: string;
  /** Calendar day in America/Bogota as YYYY-MM-DD, to group by service day. */
  readonly dayKey: string;
}

/** A decimal ready for the screen. */
export interface DecimalView {
  /** The number for calculations (dot in JSON, a plain number here). */
  readonly value: number;
  /** Text with decimal comma, for example "2,1". */
  readonly text: string;
}

/** The person who signed in. Everything here may be shown; none of it is a secret. */
export interface AuthUserView {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly role: Role;
  readonly aqueductId: string;
  readonly mustChangePassword: boolean;
}

/** Answer of a sign in. The access token is for the in-memory TokenStore only. */
export interface LoginView {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
  readonly user: AuthUserView;
}

/** A new access token after POST /auth/refresh. */
export interface RefreshView {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
}

/** Who the server says is signed in (GET /auth/me). Permissions are for showing actions only. */
export interface MeView {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly mustChangePassword: boolean;
  readonly permissions: readonly string[];
  readonly memberships: readonly Membership[];
}
