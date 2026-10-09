import type { JSX } from 'react';
import { NavLink, Outlet } from 'react-router';

import { strings } from '../../i18n/es';

export interface NavItem {
  readonly to: string;
  readonly label: string;
}

interface RoleLayoutProps {
  readonly navItems: readonly NavItem[];
}

export const MAIN_CONTENT_ID = 'main-content';

/** Shared shell for authenticated areas: skip link, header, navigation and main landmark. */
export function RoleLayout({ navItems }: RoleLayoutProps): JSX.Element {
  return (
    <>
      <a href={`#${MAIN_CONTENT_ID}`}>{strings.app.skipToContent}</a>
      <header>
        <p>{strings.app.name}</p>
        <nav aria-label={strings.app.mainNavigation}>
          <ul>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id={MAIN_CONTENT_ID}>
        <Outlet />
      </main>
    </>
  );
}
