import type { JSX } from 'react';
import { Outlet } from 'react-router';

import type { Role } from '../../core/session/roles';
import { useSession } from '../../state/hooks/useSession';
import { ForbiddenPage } from '../pages/ForbiddenPage';

interface RequireRoleProps {
  readonly roles: readonly Role[];
}

/** UX guard: shows the 403 page when the role is not in the list. The server decides for real. */
export function RequireRole({ roles }: RequireRoleProps): JSX.Element {
  const session = useSession();

  if (session.status !== 'authenticated' || !roles.includes(session.user.role)) {
    return <ForbiddenPage />;
  }
  return <Outlet />;
}
