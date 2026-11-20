import { useEffect, useId, useState } from 'react';
import type { JSX } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Droplets } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

import { SyncStatus } from '../../features/sync';
import { t } from '../../i18n/t';
import { BrandLogo } from '../../ui/brand/BrandLogo';
import { cn } from '../../ui/styles/cn';
import { PageTitleSlotContext } from '../../ui/feedback/pageTitleSlot';
import { TopBar } from './shell/TopBar';
import styles from './Shell.module.css';

export interface NavItem {
  readonly to: string;
  readonly label: string;
  /** Always shown in the desktop sidebar and in the bottom tab bar; hidden in the "Menú" fold. */
  readonly icon?: LucideIcon;
  /** Heading of the sidebar group. Consecutive items with the same one stay together. */
  readonly group?: string;
}

interface NavGroup {
  readonly label: string | null;
  readonly items: readonly NavItem[];
}

/** Keeps the order of the items: a group starts each time the heading changes. */
function groupNavItems(items: readonly NavItem[]): readonly NavGroup[] {
  const groups: { label: string | null; items: NavItem[] }[] = [];
  for (const item of items) {
    const label = item.group ?? null;
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
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
 * Shared shell of the authenticated areas (redesign v2). On a desktop the app lives in a rounded
 * frame over a tinted canvas: a dark icon rail at the left (it opens over the content on hover or
 * keyboard focus to show labels and groups) and a white surface with the top bar (page title,
 * search, bell, user) and the main landmark. On a phone the frame disappears: the operator gets a
 * bottom tab bar, the others a drawer behind the "Menú" button. The skip link, the banner, the
 * navigation and main landmarks, and the sync status stay in every layout.
 */
export function RoleLayout({ navItems, tabBar = false }: RoleLayoutProps): JSX.Element {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);
  const closeMenu = (): void => {
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className={cn(styles.canvas)} data-tab-bar={tabBar}>
      {/* Screens behind a session are not for search engines (robots.txt says the same). */}
      <meta name="robots" content="noindex" />
      <a className={cn(styles.skipLink)} href={`#${MAIN_CONTENT_ID}`}>
        {t('app.skipToContent')}
      </a>
      <div className={cn(styles.frame)}>
        <div className={cn(styles.railSlot)}>
          <nav
            id={menuId}
            aria-label={t('app.mainNavigation')}
            className={cn(styles.nav)}
            data-open={menuOpen}
            data-print-hide=""
          >
            <p className={cn(styles.brand)}>
              <span className={cn(styles.brandTile)}>
                <Droplets aria-hidden="true" />
              </span>
              <BrandLogo tone="onBrand" className={cn(styles.brandLogo)} />
            </p>
            {groupNavItems(navItems).map((group) => (
              <div key={group.label ?? 'main'} className={cn(styles.group)}>
                {group.label === null ? null : (
                  <p className={cn(styles.groupLabel)}>{group.label}</p>
                )}
                <ul className={cn(styles.list)}>
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <NavLink className={cn(styles.link)} to={to} onClick={closeMenu}>
                        <span className={cn(styles.iconWrap)}>
                          {Icon !== undefined && <Icon aria-hidden="true" />}
                        </span>
                        <span className={cn(styles.label)}>{label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          {!tabBar && (
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className={cn(styles.scrim)}
              data-open={menuOpen}
              onClick={closeMenu}
            />
          )}
        </div>
        <div className={cn(styles.surface)}>
          <PageTitleSlotContext value={titleSlot}>
            <TopBar
              navItems={navItems}
              titleRef={setTitleSlot}
              menu={
                tabBar
                  ? null
                  : {
                      id: menuId,
                      open: menuOpen,
                      onToggle: () => {
                        setMenuOpen((open) => !open);
                      },
                    }
              }
            />
            <div data-print-hide="">
              <SyncStatus />
            </div>
            <main id={MAIN_CONTENT_ID} className={cn(styles.main)}>
              <Outlet />
            </main>
          </PageTitleSlotContext>
        </div>
      </div>
    </div>
  );
}
