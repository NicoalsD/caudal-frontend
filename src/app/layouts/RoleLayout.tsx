import type { JSX } from 'react';
import { NavLink, Outlet } from 'react-router';

import { strings } from '../../i18n/es';
import { cn } from '../../ui/styles/cn';
import styles from './Layout.module.css';

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
      <a className={cn(styles.skipLink)} href={`#${MAIN_CONTENT_ID}`}>
        {strings.app.skipToContent}
      </a>
      <header className={cn(styles.header)}>
        <p className={cn(styles.brand)}>{strings.app.name}</p>
        <nav aria-label={strings.app.mainNavigation}>
          <ul className={cn(styles.navList)}>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink className={cn(styles.navLink)} to={item.to}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id={MAIN_CONTENT_ID} className={cn(styles.main)}>
        <Outlet />
      </main>
    </>
  );
}
