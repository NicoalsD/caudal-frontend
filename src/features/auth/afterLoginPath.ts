import type { SessionUser } from '../../core/session/SessionState';
import { canRoleOpenPath, HOME_PATH_BY_ROLE, ROUTE_PATHS } from '../../core/session/routes';

/**
 * Where a signed-in person goes: the change-password screen while the server demands it,
 * otherwise the internal `next` route they asked for, otherwise the home of their role. The `next`
 * may come from the previous person of a shared device, who signed out on a screen of their own
 * role: a route this role cannot open is ignored instead of ending on the 403 page.
 */
export function afterLoginPath(user: SessionUser, next: string | null): string {
  if (user.mustChangePassword) {
    return ROUTE_PATHS.changePassword;
  }
  if (user.privacyNoticePending === true) {
    return ROUTE_PATHS.privacyNotice;
  }
  // After a password change the guard sent the person to login from this very screen.
  const target = next === ROUTE_PATHS.changePassword ? null : next;
  return target !== null && canRoleOpenPath(user.role, target)
    ? target
    : HOME_PATH_BY_ROLE[user.role];
}
