import type { JSX } from 'react';
import { Navigate } from 'react-router';

import { useSession } from '../../state/hooks/useSession';
import { HOME_PATH_BY_ROLE, ROUTE_PATHS } from '../routes';

/** "/" sends each visitor to the first screen of their role, or to /login. */
export function RootRedirect(): JSX.Element {
  const session = useSession();
  const target =
    session.status === 'authenticated' ? HOME_PATH_BY_ROLE[session.user.role] : ROUTE_PATHS.login;
  return <Navigate to={target} replace />;
}
