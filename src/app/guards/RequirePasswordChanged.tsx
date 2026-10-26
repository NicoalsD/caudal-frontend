import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router';

import { ROUTE_PATHS } from '../../core/session/routes';
import { useSession } from '../../state/hooks/useSession';

/**
 * UX guard: while the server demands a new password, every private route leads to the change
 * screen. The server enforces it too (403 PASSWORD_CHANGE_REQUIRED on everything else).
 */
export function RequirePasswordChanged(): JSX.Element {
  const session = useSession();

  if (session.status === 'authenticated' && session.user.mustChangePassword) {
    return <Navigate to={ROUTE_PATHS.changePassword} replace />;
  }
  return <Outlet />;
}
