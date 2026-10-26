import type { JSX } from 'react';

import { useSession } from '../../state/hooks/useSession';
import { BOARD_ADMIN_NAV, BOARD_NAV } from './navigation';
import { RoleLayout } from './RoleLayout';

export function BoardLayout(): JSX.Element {
  const session = useSession();
  const isAdmin = session.status === 'authenticated' && session.user.role === 'BOARD_ADMIN';
  return <RoleLayout navItems={isAdmin ? [...BOARD_NAV, ...BOARD_ADMIN_NAV] : BOARD_NAV} />;
}
