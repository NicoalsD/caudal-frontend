import type { JSX } from 'react';

import { useSession } from '../../state/hooks/useSession';
import { BoardLayout } from './BoardLayout';
import { OperatorLayout } from './OperatorLayout';
import { TeamLayout } from './TeamLayout';

/** Layout for routes shared by several roles (for example /tanque): picks the one of the user's role. */
export function SharedLayout(): JSX.Element {
  const session = useSession();
  const role = session.status === 'authenticated' ? session.user.role : null;

  if (role === 'OPERATOR') {
    return <OperatorLayout />;
  }
  if (role === 'PROJECT_TEAM') {
    return <TeamLayout />;
  }
  return <BoardLayout />;
}
