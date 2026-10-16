import { useId, useState } from 'react';
import type { JSX } from 'react';
import { Menu, X } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

import { SignOutButton } from '../../features/auth/SignOutButton';
import { SyncStatus } from '../../features/sync';
import { t } from '../../i18n/t';
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

/**
 * Shared shell for authenticated areas: skip link, header, navigation and main landmark. On a
 * narrow screen the links fold behind a "Menú" button, so the screen starts with its content and
 * not with a wall of links; the menu closes again after each navigation.
 */
export function RoleLayout({ navItems }: RoleLayoutProps): JSX.Element {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <a className={cn(styles.skipLink)} href={`#${MAIN_CONTENT_ID}`}>
        {t('app.skipToContent')}
      </a>
      <header className={cn(styles.header)}>
        <p className={cn(styles.brand)}>{t('app.name')}</p>
        <button
          type="button"
          className={cn(styles.menuToggle)}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          {t('app.menu')}
        </button>
        <div id={menuId} className={cn(styles.menu)} data-open={menuOpen}>
          <nav aria-label={t('app.mainNavigation')}>
            <ul className={cn(styles.navList)}>
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    className={cn(styles.navLink)}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <SignOutButton />
        </div>
      </header>
      <SyncStatus />
      <main id={MAIN_CONTENT_ID} className={cn(styles.main)}>
        <Outlet />
      </main>
    </>
  );
}
