import type { SessionUser } from '../../core/session/SessionState';
import { HOME_PATH_BY_ROLE, ROUTE_PATHS } from '../../core/session/routes';

/**
 * Where a signed-in person goes: the change-password screen while the server demands it,
 * otherwise the internal `next` route they asked for, otherwise the home of their role.
 */
export function afterLoginPath(user: SessionUser, next: string | null): string {
  if (user.mustChangePassword) {
    return ROUTE_PATHS.changePassword;
  }
  return next ?? HOME_PATH_BY_ROLE[user.role];
}
