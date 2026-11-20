import type { JSX } from 'react';

import { isAdminRole } from '../../core/session/roles';
import { useSession } from '../../state/hooks/useSession';
import { BOARD_ADMIN_NAV, BOARD_NAV, VIEWER_NAV } from './navigation';
import { RoleLayout } from './RoleLayout';

export function BoardLayout(): JSX.Element {
  const session = useSession();
  if (session.status === 'authenticated' && session.user.role === 'VIEWER') {
    return <RoleLayout navItems={VIEWER_NAV} />;
  }
  const isAdmin = session.status === 'authenticated' && isAdminRole(session.user.role);
  return <RoleLayout navItems={isAdmin ? [...BOARD_NAV, ...BOARD_ADMIN_NAV] : BOARD_NAV} />;
}
