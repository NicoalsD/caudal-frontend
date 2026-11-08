import { ChevronDown } from 'lucide-react';
import type { JSX } from 'react';

import type { Role } from '../../../core/session/roles';
import { t } from '../../../i18n/t';
import { SignOutButton } from '../../../features/auth/SignOutButton';
import { useSession } from '../../../state/hooks/useSession';
import { Avatar } from '../../../ui/primitives/Avatar';
import { Popover } from '../../../ui/primitives/Popover';
import { cn } from '../../../ui/styles/cn';
import styles from './TopBar.module.css';

const ROLE_TEXT = {
  BOARD_ADMIN: 'shell.roles.boardAdmin',
  BOARD_MEMBER: 'shell.roles.boardMember',
  OPERATOR: 'shell.roles.operator',
  PROJECT_TEAM: 'shell.roles.projectTeam',
  SUPPORT_ENTITY: 'shell.roles.supportEntity',
} as const satisfies Record<Role, string>;

/** User pill: initials, name and role; its menu holds the sign out. */
export function UserMenu(): JSX.Element | null {
  const session = useSession();
  if (session.status !== 'authenticated') {
    return null;
  }
  const { displayName, role } = session.user;
  return (
    <Popover
      label={t('shell.userMenu', { name: displayName })}
      align="end"
      renderTrigger={(trigger) => (
        <button
          type="button"
          {...trigger}
          aria-label={t('shell.userMenu', { name: displayName })}
          className={cn(styles.userPill)}
        >
          <Avatar name={displayName} size="sm" tone="dark" />
          <span className={cn(styles.userText)}>
            <span className={cn(styles.userName)}>{displayName}</span>
            <span className={cn(styles.userRole)}>{t(ROLE_TEXT[role])}</span>
          </span>
          <ChevronDown aria-hidden="true" className={cn(styles.chevron)} />
        </button>
      )}
    >
      <div className={cn(styles.userPanel)}>
        <Avatar name={displayName} size="lg" tone="aqua" />
        <p className={cn(styles.userName)}>{displayName}</p>
        <p className={cn(styles.userRole)}>{t(ROLE_TEXT[role])}</p>
        <SignOutButton />
      </div>
    </Popover>
  );
}
