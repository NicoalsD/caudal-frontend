import type { JSX } from 'react';

import { TEAM_NAV } from './navigation';
import { RoleLayout } from './RoleLayout';

export function TeamLayout(): JSX.Element {
  return <RoleLayout navItems={TEAM_NAV} />;
}
