import { KeyRound, UserCog, UserX } from 'lucide-react';
import { useState } from 'react';
import type { JSX } from 'react';

import type { AccountRole } from '../../core/users/accountRoles';
import { t } from '../../i18n/t';
import type { ManagedUserStatus, ManagedUserView, ResetGrantView } from '../../services/api/views';
import type { BadgeTone } from '../../ui/primitives/Badge';
import { IconButton } from '../../ui/primitives/IconButton';
import styles from './Users.module.css';
import { ChangeRoleDialog, DeactivateDialog, ResetGrantDialog } from './UserDialogs';

interface UserActionsProps {
  readonly user: ManagedUserView;
  /** The role in effect now, or null when the account has none. */
  readonly role: AccountRole | null;
  readonly onChanged: (message: string) => void;
  readonly onIssued: (grant: ResetGrantView) => void;
}

const DISABLED: ManagedUserStatus = 'DISABLED';

export function statusText(status: ManagedUserStatus): string {
  switch (status) {
    case 'ACTIVE':
      return t('users.statuses.active');
    case 'LOCKED':
      return t('users.statuses.locked');
    case 'DISABLED':
      return t('users.statuses.disabled');
  }
}

export function statusTone(status: ManagedUserStatus): BadgeTone {
  switch (status) {
    case 'ACTIVE':
      return 'ok';
    case 'LOCKED':
      return 'warning';
    case 'DISABLED':
      return 'neutral';
  }
}

/**
 * What the Board can do with one account. Disabled accounts have no actions (the server answers
 * INVALID_STATE_TRANSITION to any change).
 */
export function UserActions({ user, role, onChanged, onIssued }: UserActionsProps): JSX.Element {
  const [changingRole, setChangingRole] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const current = role === null ? null : { membershipId: role.membershipId, role: role.roleCode };

  if (user.status === DISABLED) {
    return <span className={styles.muted}>{t('users.noActions')}</span>;
  }
  return (
    <div className={styles.actions}>
      <ChangeRoleDialog
        user={user}
        current={current}
        open={changingRole}
        onOpenChange={setChangingRole}
        trigger={
          <IconButton label={t('users.changeRole')}>
            <UserCog aria-hidden="true" />
          </IconButton>
        }
        onDone={() => {
          onChanged(t('users.saved'));
        }}
      />
      <ResetGrantDialog
        user={user}
        open={resetting}
        onOpenChange={setResetting}
        trigger={
          <IconButton label={t('users.resetPassword')}>
            <KeyRound aria-hidden="true" />
          </IconButton>
        }
        onIssued={onIssued}
      />
      <DeactivateDialog
        user={user}
        open={deactivating}
        onOpenChange={setDeactivating}
        trigger={
          <IconButton label={t('users.deactivate')}>
            <UserX aria-hidden="true" />
          </IconButton>
        }
        onDone={() => {
          onChanged(t('users.saved'));
        }}
      />
    </div>
  );
}
