import { Menu, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';

import { t } from '../../../i18n/t';
import { IconButton } from '../../../ui/primitives/IconButton';
import { cn } from '../../../ui/styles/cn';
import type { NavItem } from '../RoleLayout';
import { CommandPalette } from './CommandPalette';
import { NotificationBell } from './NotificationBell';
import styles from './TopBar.module.css';
import { UserMenu } from './UserMenu';

interface TopBarProps {
  readonly navItems: readonly NavItem[];
  /** Receives the element where the screen draws its h1. */
  readonly titleRef: (element: HTMLDivElement | null) => void;
  /** Shown on a phone when the links fold into a drawer; null when there is a tab bar. */
  readonly menu: {
    readonly id: string;
    readonly open: boolean;
    readonly onToggle: () => void;
  } | null;
}

/**
 * Top bar of the shell: menu button (phones), the page title, the search pill with its command
 * palette, the bell and the user pill. It is the page's banner landmark.
 */
export function TopBar({ navItems, titleRef, menu }: TopBarProps): JSX.Element {
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearching(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <header className={cn(styles.bar)}>
      {menu !== null && (
        <IconButton
          label={t('app.menu')}
          className={cn(styles.menuToggle)}
          aria-expanded={menu.open}
          aria-controls={menu.id}
          onClick={menu.onToggle}
        >
          {menu.open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </IconButton>
      )}
      <div ref={titleRef} className={cn(styles.title)} />
      <div className={cn(styles.actions)} data-print-hide="">
        <button
          type="button"
          className={cn(styles.searchPill)}
          onClick={() => {
            setSearching(true);
          }}
        >
          <Search aria-hidden="true" />
          <span>{t('shell.search')}</span>
          <kbd className={cn(styles.searchKey)}>{t('shell.searchShortcut')}</kbd>
        </button>
        <IconButton
          label={t('shell.search')}
          className={cn(styles.searchIcon)}
          onClick={() => {
            setSearching(true);
          }}
        >
          <Search aria-hidden="true" />
        </IconButton>
        <NotificationBell />
        <UserMenu />
      </div>
      <CommandPalette open={searching} onOpenChange={setSearching} items={navItems} />
    </header>
  );
}
