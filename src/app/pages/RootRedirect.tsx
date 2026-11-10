import { lazy, Suspense } from 'react';
import type { JSX } from 'react';
import { Navigate } from 'react-router';

import { useSession } from '../../state/hooks/useSession';
import { HOME_PATH_BY_ROLE } from '../../core/session/routes';

/** Only visitors without a session download the presentation page. */
const LandingPage = lazy(async () => ({
  default: (await import('../../features/landing')).LandingPage,
}));

/**
 * "/" sends each signed-in person to the first screen of their role. Everyone else sees the
 * presentation page, also while the session is being restored, so it never waits on the API.
 */
export function RootRedirect(): JSX.Element {
  const session = useSession();
  if (session.status === 'authenticated') {
    return <Navigate to={HOME_PATH_BY_ROLE[session.user.role]} replace />;
  }
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  );
}
