import type { JSX } from 'react';

import { OPERATOR_NAV } from './navigation';
import { RoleLayout } from './RoleLayout';

export function OperatorLayout(): JSX.Element {
  return <RoleLayout navItems={OPERATOR_NAV} />;
}
