import type { JSX } from 'react';

import { useSession } from '../../state/hooks/useSession';
import { BoardLayout } from './BoardLayout';
import { TeamLayout } from './TeamLayout';

/**
 * The audit log and the devices are shared by two areas: the Board's administrator sees the Board
 * menu, the team the team menu.
 */
export function AuditLayout(): JSX.Element {
  const session = useSession();
  const isBoardAdmin = session.status === 'authenticated' && session.user.role === 'BOARD_ADMIN';
  return isBoardAdmin ? <BoardLayout /> : <TeamLayout />;
}
