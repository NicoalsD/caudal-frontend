import { useId, useState } from 'react';
import type { JSX } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Menu, X } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

import { SignOutButton } from '../../features/auth/SignOutButton';
import { SyncStatus } from '../../features/sync';
import { t } from '../../i18n/t';
import { BrandLogo } from '../../ui/brand/BrandLogo';
import { cn } from '../../ui/styles/cn';
import styles from './Layout.module.css';

export interface NavItem {
  readonly to: string;
  readonly label: string;
  /** Needed only by layouts that show the bottom tab bar. */
  readonly icon?: LucideIcon;
}

interface RoleLayoutProps {
  readonly navItems: readonly NavItem[];
  /**
   * On a narrow screen, show the links as a bottom tab bar within thumb reach instead of folding
   * them behind "Menú". Only for short lists (the operator's five destinations).
   */
  readonly tabBar?: boolean;
}

export const MAIN_CONTENT_ID = 'main-content';

/**
 * Shared shell for authenticated areas: skip link, brand header, navigation and main landmark. On
 * a narrow screen the links fold behind a "Menú" button (or move to a bottom tab bar), so the
 * screen starts with its content and not with a wall of links.
 */
export function RoleLayout({ navItems, tabBar = false }: RoleLayoutProps): JSX.Element {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={cn(styles.shell)} data-tab-bar={tabBar}>
      {/* Screens behind a session are not for search engines (robots.txt says the same). */}
      <meta name="robots" content="noindex" />
      <a className={cn(styles.skipLink)} href={`#${MAIN_CONTENT_ID}`}>
        {t('app.skipToContent')}
      </a>
      <header className={cn(styles.header)}>
        <p className={cn(styles.brand)}>
          <BrandLogo tone="onBrand" />
        </p>
        {!tabBar && (
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
        )}
        <div id={menuId} className={cn(styles.menu)} data-open={menuOpen}>
          <nav aria-label={t('app.mainNavigation')} className={cn(styles.nav)}>
            <ul className={cn(styles.navList)}>
              {navItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    className={cn(styles.navLink)}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                  >
                    {tabBar && Icon !== undefined && (
                      <Icon className={cn(styles.navIcon)} aria-hidden="true" />
                    )}
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className={cn(styles.signOut)}>
            <SignOutButton />
          </div>
        </div>
      </header>
      <SyncStatus />
      <main id={MAIN_CONTENT_ID} className={cn(styles.main)}>
        <Outlet />
      </main>
    </div>
  );
}
