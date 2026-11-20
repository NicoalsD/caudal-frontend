import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router';

import { ROUTE_PATHS } from '../../core/session/routes';
import { useSession } from '../../state/hooks/useSession';

/**
 * UX guard: while the server demands the privacy notice, every private route leads to the notice
 * screen. Like RequirePasswordChanged it sits below the auth guard, and the server enforces it
 * too (403 PRIVACY_NOTICE_PENDING on everything else).
 */
export function RequirePrivacyAccepted(): JSX.Element {
  const session = useSession();

  if (session.status === 'authenticated' && session.user.privacyNoticePending === true) {
    return <Navigate to={ROUTE_PATHS.privacyNotice} replace />;
  }
  return <Outlet />;
}
