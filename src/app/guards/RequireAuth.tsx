import type { JSX } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { useSession } from '../../state/hooks/useSession';
import { ROUTE_PATHS } from '../routes';

/** UX guard: sends anonymous visitors to /login keeping the internal route in ?next=. */
export function RequireAuth(): JSX.Element {
  const session = useSession();
  const location = useLocation();

  if (session.status !== 'authenticated') {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to={`${ROUTE_PATHS.login}?next=${next}`} replace />;
  }
  return <Outlet />;
}
