import type { JSX } from 'react';

import { isAdminRole } from '../../core/session/roles';
import { useSession } from '../../state/hooks/useSession';
import { BoardLayout } from './BoardLayout';
import { TeamLayout } from './TeamLayout';

/** The AI evaluation is shared by two areas: the institution's administrator sees the Board menu, the team the team menu. */
export function EvaluationLayout(): JSX.Element {
  const session = useSession();
  const isAdmin = session.status === 'authenticated' && isAdminRole(session.user.role);
  return isAdmin ? <BoardLayout /> : <TeamLayout />;
}
