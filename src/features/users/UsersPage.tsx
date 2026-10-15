import { useMemo, useState } from 'react';
import type { JSX } from 'react';

import { currentRoleByUser } from '../../core/users/accountRoles';
import type { AccountRole } from '../../core/users/accountRoles';
import { t } from '../../i18n/t';
import type {
  CreatedUserView,
  ManagedMembershipView,
  ResetGrantView,
} from '../../services/api/views';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { OneTimeCodeDialog } from './OneTimeCodeDialog';
import type { IssuedCode } from './OneTimeCodeDialog';
import styles from './Users.module.css';
import { CreateUserDialog } from './UserDialogs';
import { UserRow } from './UserRow';
import { useAllMemberships, useManagedUsers } from './userQueries';

function toAccountRole(membership: ManagedMembershipView): AccountRole {
  return {
    membershipId: membership.id,
    userId: membership.userId,
    roleCode: membership.roleCode,
    validFromMs: membership.validFrom.date.getTime(),
    validToMs: membership.validTo === null ? null : membership.validTo.date.getTime(),
  };
}

/**
 * Screen S19: the accounts of the aqueduct, their role and status, and what the Board can do with
 * them. Only BOARD_ADMIN reaches it; the server checks every call.
 */
export function UsersPage(): JSX.Element {
  const users = useManagedUsers();
  const memberships = useAllMemberships();
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<IssuedCode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** The moment the list was opened: roles that ended since then are shown as no role. */
  const [openedAtMs] = useState(() => Date.now());
  const roleByUser = useMemo(() => {
    const roles = (memberships.data ?? []).map(toAccountRole);
    return currentRoleByUser(roles, openedAtMs);
  }, [memberships.data, openedAtMs]);

  if (users.isPending || memberships.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.users')}</ScreenTitle>
        <LoadingState message={t('users.loading')} />
      </>
    );
  }
  if (users.isError || memberships.isError) {
    return (
      <QueryError
        title={t('screens.users')}
        error={users.error ?? memberships.error}
        onRetry={() => {
          void users.refetch();
          void memberships.refetch();
        }}
      />
    );
  }

  const items = users.data.pages.flatMap((page) => page.items);

  return (
    <>
      <ScreenTitle>{t('screens.users')}</ScreenTitle>
      <div className={cn(styles.toolbar)}>
        <CreateUserDialog
          open={creating}
          onOpenChange={setCreating}
          trigger={<Button variant="primary">{t('users.create')}</Button>}
          onCreated={(created: CreatedUserView) => {
            setNotice(null);
            setIssued({
              title: t('users.codeTitle'),
              description: t('users.codeDescription'),
              code: created.activationCode,
              expiresText: created.expiresAt.text,
            });
          }}
        />
      </div>
      {notice === null ? null : <p role="status">{notice}</p>}
      {items.length === 0 ? (
        <p>{t('users.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {items.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              role={roleByUser.get(user.id) ?? null}
              onChanged={setNotice}
              onIssued={(grant: ResetGrantView) => {
                setNotice(null);
                setIssued({
                  title: t('users.codeResetTitle'),
                  description: t('users.codeResetDescription'),
                  code: grant.code,
                  expiresText: grant.expiresAt.text,
                });
              }}
            />
          ))}
        </ul>
      )}
      {users.hasNextPage ? (
        <Button
          disabled={users.isFetchingNextPage}
          onClick={() => {
            void users.fetchNextPage();
          }}
        >
          {t('users.loadMore')}
        </Button>
      ) : null}
      <OneTimeCodeDialog
        issued={issued}
        onClose={() => {
          setIssued(null);
        }}
      />
    </>
  );
}
