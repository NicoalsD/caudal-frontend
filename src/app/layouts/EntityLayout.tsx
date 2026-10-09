import type { JSX } from 'react';

import { ENTITY_NAV } from './navigation';
import { RoleLayout } from './RoleLayout';

export function EntityLayout(): JSX.Element {
  return <RoleLayout navItems={ENTITY_NAV} />;
}
