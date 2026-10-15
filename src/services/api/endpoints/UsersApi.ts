import type { Role } from '../../../core/session/roles';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type {
  CreatedUserView,
  ManagedMembershipPageView,
  ManagedMembershipView,
  ManagedUserPageView,
  ManagedUserStatus,
  ManagedUserView,
  ResetGrantView,
} from '../views';

type ManagedUserPageDto = components['schemas']['ManagedUserPage'];
type ManagedUserDto = components['schemas']['ManagedUser'];
type CreatedUserDto = components['schemas']['CreatedUser'];
type UpdateUserDto = components['schemas']['UpdateUserRequest'];
type ResetGrantDto = components['schemas']['ResetGrant'];
type ManagedMembershipPageDto = components['schemas']['ManagedMembershipPage'];
type ManagedMembershipDto = components['schemas']['ManagedMembership'];
type GrantMembershipDto = components['schemas']['GrantMembershipRequest'];

/** Input of POST /users (API.md 3.2). The aqueduct is the one of the session. */
export interface CreateUserInput {
  readonly username: string;
  readonly fullName: string;
  readonly aqueductId: string;
  readonly role: Role;
}

/** Input of PATCH /users/{id}: only the fields that change. */
export interface UpdateUserInput {
  readonly fullName?: string;
  readonly status?: ManagedUserStatus;
}

/**
 * Accounts, one-time codes and memberships of the Board (API.md section 3). Only BOARD_ADMIN
 * (USER_MANAGE) reaches these routes; the server checks it on every call.
 */
export class UsersApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /users: one page; pass the previous `nextCursor` to get the next one. */
  async listUsers(cursor?: string): Promise<ManagedUserPageView> {
    const response = await this.http.request<ManagedUserPageDto>({
      method: 'GET',
      path: '/users',
      ...(cursor === undefined ? {} : { query: { cursor } }),
    });
    return this.adapter.toManagedUserPage(response.body);
  }

  /** POST /users (201). The activation code comes back once, in this answer only. */
  async createUser(input: CreateUserInput): Promise<CreatedUserView> {
    const body = {
      username: input.username,
      full_name: input.fullName,
      aqueduct_id: input.aqueductId,
      role: input.role,
    };
    const response = await this.http.request<CreatedUserDto>({
      method: 'POST',
      path: '/users',
      body,
    });
    return this.adapter.toCreatedUser(response.body);
  }

  /** PATCH /users/{id}. Blocking or disabling closes the person's sessions on the server. */
  async updateUser(id: string, input: UpdateUserInput): Promise<ManagedUserView> {
    const body: UpdateUserDto = {
      ...(input.fullName === undefined ? {} : { full_name: input.fullName }),
      ...(input.status === undefined ? {} : { status: input.status }),
    };
    const response = await this.http.request<ManagedUserDto>({
      method: 'PATCH',
      path: `/users/${encodeURIComponent(id)}`,
      body,
    });
    return this.adapter.toManagedUser(response.body);
  }

  /** POST /users/{id}/reset-grants (201): a one-time code to set a password. */
  async issueResetGrant(id: string, reason: string): Promise<ResetGrantView> {
    const response = await this.http.request<ResetGrantDto>({
      method: 'POST',
      path: `/users/${encodeURIComponent(id)}/reset-grants`,
      body: { reason },
    });
    return this.adapter.toResetGrant(response.body);
  }

  /** GET /memberships: one page of the aqueduct's roles, optionally of one account. */
  async listMemberships(cursor?: string): Promise<ManagedMembershipPageView> {
    const response = await this.http.request<ManagedMembershipPageDto>({
      method: 'GET',
      path: '/memberships',
      ...(cursor === undefined ? {} : { query: { cursor } }),
    });
    return this.adapter.toManagedMembershipPage(response.body);
  }

  /** POST /memberships (201). The server refuses an overlap with another role (MEMBERSHIP_OVERLAP). */
  async grantMembership(input: {
    readonly userId: string;
    readonly aqueductId: string;
    readonly roleCode: Role;
  }): Promise<ManagedMembershipView> {
    const body: GrantMembershipDto = {
      user_id: input.userId,
      aqueduct_id: input.aqueductId,
      role_code: input.roleCode,
    };
    const response = await this.http.request<ManagedMembershipDto>({
      method: 'POST',
      path: '/memberships',
      body,
    });
    return this.adapter.toManagedMembership(response.body);
  }

  /** DELETE /memberships/{id} (204): ends the role now; the row stays for the audit log. */
  async revokeMembership(id: string): Promise<void> {
    await this.http.request<undefined>({
      method: 'DELETE',
      path: `/memberships/${encodeURIComponent(id)}`,
    });
  }
}
