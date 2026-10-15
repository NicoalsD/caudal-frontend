import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';

import type { Role } from '../../core/session/roles';
import type { UpdateUserInput, CreateUserInput } from '../../services/api/endpoints/UsersApi';
import type {
  CreatedUserView,
  ManagedMembershipView,
  ManagedUserPageView,
  ManagedUserView,
  ResetGrantView,
} from '../../services/api/views';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { aqueductKey } from '../../state/queryKeys';

const USERS_SCOPE = 'users';
const MEMBERSHIPS_SCOPE = 'memberships';

/** Creating and resetting hand out a one-time code: the cache must not keep it (gcTime 0). */
const NO_CACHE_MS = 0;

function useUsersKey(): readonly string[] {
  return aqueductKey(useAqueductId(), USERS_SCOPE);
}

function useMembershipsKey(): readonly string[] {
  return aqueductKey(useAqueductId(), MEMBERSHIPS_SCOPE);
}

/** GET /users, page by page. */
export function useManagedUsers(): UseInfiniteQueryResult<{
  readonly pages: readonly ManagedUserPageView[];
}> {
  const api = useCaudalApi();
  const key = useUsersKey();
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => api.users.listUsers(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}

/** Every account of the aqueduct, read to the last page (for pickers that need all of them). */
export function useAllUsers(): UseQueryResult<readonly ManagedUserView[]> {
  const api = useCaudalApi();
  const key = useUsersKey();
  return useQuery({
    queryKey: [...key, 'all'],
    queryFn: async () => {
      const all: ManagedUserView[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      while (hasMore) {
        const page = await api.users.listUsers(cursor);
        all.push(...page.items);
        cursor = page.nextCursor ?? undefined;
        hasMore = cursor !== undefined;
      }
      return all;
    },
    refetchOnWindowFocus: false,
  });
}

/**
 * Every membership of the aqueduct, read to the last page: the list shows the role of each
 * account, and the server does not filter by role.
 */
export function useAllMemberships(): UseQueryResult<readonly ManagedMembershipView[]> {
  const api = useCaudalApi();
  const key = useMembershipsKey();
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const all: ManagedMembershipView[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      while (hasMore) {
        const page = await api.users.listMemberships(cursor);
        all.push(...page.items);
        cursor = page.nextCursor ?? undefined;
        hasMore = cursor !== undefined;
      }
      return all;
    },
    refetchOnWindowFocus: false,
  });
}

/** POST /users. The result (with the one-time code) goes to the caller and nowhere else. */
export function useCreateUser(): UseMutationResult<CreatedUserView, Error, CreateUserInput> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const usersKey = useUsersKey();
  const membershipsKey = useMembershipsKey();
  return useMutation({
    mutationFn: (input) => api.users.createUser(input),
    gcTime: NO_CACHE_MS,
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: usersKey });
      await client.invalidateQueries({ queryKey: membershipsKey });
    },
  });
}

export interface UserChange {
  readonly id: string;
  readonly input: UpdateUserInput;
}

/** PATCH /users/{id} (name or status). The list is read again afterwards. */
export function useUpdateUser(): UseMutationResult<ManagedUserView, Error, UserChange> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const usersKey = useUsersKey();
  return useMutation({
    mutationFn: (change) => api.users.updateUser(change.id, change.input),
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: usersKey });
    },
  });
}

/** The old role already ended but the new one could not start: the account has no role now. */
export class RoleGrantFailedError extends Error {
  constructor(override readonly cause: unknown) {
    super('The previous membership ended but the new one was not granted');
    this.name = 'RoleGrantFailedError';
  }
}

export interface RoleChange {
  readonly userId: string;
  /** The role in effect now, which ends first. Null when the account has none. */
  readonly currentMembershipId: string | null;
  readonly role: Role;
}

/**
 * Changes the role: the current membership ends, then the new one starts (the server has no
 * update for roles, API.md 3.5 and 3.7). If the second step fails, the list is read again so the
 * screen shows the real state, and the failure reaches the caller.
 */
export function useChangeRole(): UseMutationResult<void, Error, RoleChange> {
  const api = useCaudalApi();
  const client = useQueryClient();
  const aqueductId = useAqueductId();
  const usersKey = useUsersKey();
  const membershipsKey = useMembershipsKey();
  return useMutation({
    mutationFn: async (change) => {
      const revoked = change.currentMembershipId !== null;
      if (change.currentMembershipId !== null) {
        await api.users.revokeMembership(change.currentMembershipId);
      }
      try {
        await api.users.grantMembership({
          userId: change.userId,
          aqueductId,
          roleCode: change.role,
        });
      } catch (error) {
        throw revoked ? new RoleGrantFailedError(error) : error;
      }
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: membershipsKey });
      await client.invalidateQueries({ queryKey: usersKey });
    },
  });
}

/** POST /users/{id}/reset-grants. The code is returned once; nothing is cached (gcTime 0). */
export function useIssueResetGrant(): UseMutationResult<
  ResetGrantView,
  Error,
  { readonly userId: string; readonly reason: string }
> {
  const api = useCaudalApi();
  return useMutation({
    mutationFn: (change) => api.users.issueResetGrant(change.userId, change.reason),
    gcTime: NO_CACHE_MS,
  });
}
