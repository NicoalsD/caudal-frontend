import { useState } from 'react';
import type { JSX } from 'react';

import type { AccountRole } from '../../core/users/accountRoles';
import { t } from '../../i18n/t';
import type { ManagedUserStatus, ManagedUserView, ResetGrantView } from '../../services/api/views';
import { Button } from '../../ui/primitives/Button';
import styles from './Users.module.css';
import { ChangeRoleDialog, DeactivateDialog, ResetGrantDialog } from './UserDialogs';
import { roleText } from './roleText';

interface UserRowProps {
  readonly user: ManagedUserView;
  /** The role in effect now, or null when the account has none. */
  readonly role: AccountRole | null;
  readonly onChanged: (message: string) => void;
  readonly onIssued: (grant: ResetGrantView) => void;
}

const DISABLED: ManagedUserStatus = 'DISABLED';

function statusText(status: ManagedUserStatus): string {
  switch (status) {
    case 'ACTIVE':
      return t('users.statuses.active');
    case 'LOCKED':
      return t('users.statuses.locked');
    case 'DISABLED':
      return t('users.statuses.disabled');
  }
}

/**
 * One account: name, username, role, status and what the Board can do with it. Disabled accounts
 * have no actions (the server answers INVALID_STATE_TRANSITION to any change).
 */
export function UserRow({ user, role, onChanged, onIssued }: UserRowProps): JSX.Element {
  const [changingRole, setChangingRole] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const isDisabled = user.status === DISABLED;
  const current = role === null ? null : { membershipId: role.membershipId, role: role.roleCode };

  return (
    <li className={styles.item}>
      <h3 className={styles.name}>{user.fullName}</h3>
      <p className={styles.meta}>{user.username}</p>
      <p className={styles.meta}>
        {t('users.roleLine', {
          role: role === null ? t('users.noRole') : roleText(role.roleCode),
        })}
      </p>
      <p className={styles.meta}>{t('users.statusLine', { status: statusText(user.status) })}</p>
      <p className={styles.meta}>
        {user.lastLoginAt === null
          ? t('users.neverLoggedIn')
          : t('users.lastLogin', { date: user.lastLoginAt.text })}
      </p>
      {user.mustChangePassword ? <p className={styles.meta}>{t('users.passwordPending')}</p> : null}
      {isDisabled ? null : (
        <div className={styles.actions}>
          <ChangeRoleDialog
            user={user}
            current={current}
            open={changingRole}
            onOpenChange={setChangingRole}
            trigger={<Button>{t('users.changeRole')}</Button>}
            onDone={() => {
              onChanged(t('users.saved'));
            }}
          />
          <ResetGrantDialog
            user={user}
            open={resetting}
            onOpenChange={setResetting}
            trigger={<Button>{t('users.resetPassword')}</Button>}
            onIssued={onIssued}
          />
          <DeactivateDialog
            user={user}
            open={deactivating}
            onOpenChange={setDeactivating}
            trigger={<Button>{t('users.deactivate')}</Button>}
            onDone={() => {
              onChanged(t('users.saved'));
            }}
          />
        </div>
      )}
    </li>
  );
}
