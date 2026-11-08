import { CircleSlash, ShieldCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { JSX } from 'react';

import { currentRoleByUser } from '../../core/users/accountRoles';
import type { AccountRole } from '../../core/users/accountRoles';
import { t } from '../../i18n/t';
import type {
  CreatedUserView,
  ManagedMembershipView,
  ManagedUserView,
  ResetGrantView,
} from '../../services/api/views';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { StatTile } from '../../ui/cards/StatTile';
import { DataTable } from '../../ui/data/DataTable';
import type { DataColumn } from '../../ui/data/DataTable';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Avatar } from '../../ui/primitives/Avatar';
import { Badge } from '../../ui/primitives/Badge';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { cn } from '../../ui/styles/cn';
import { OneTimeCodeDialog } from './OneTimeCodeDialog';
import type { IssuedCode } from './OneTimeCodeDialog';
import styles from './Users.module.css';
import { CreateUserDialog } from './UserDialogs';
import { roleText } from './roleText';
import { UserActions, statusText, statusTone } from './UserActions';
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
  const activeCount = items.filter((user) => user.status === 'ACTIVE').length;
  const blockedCount = items.filter((user) => user.status !== 'ACTIVE').length;
  const issue = (title: string, description: string, code: string, expiresText: string): void => {
    setNotice(null);
    setIssued({ title, description, code, expiresText });
  };

  const columns: readonly DataColumn<ManagedUserView>[] = [
    {
      id: 'person',
      header: t('users.columns.person'),
      cell: (user) => (
        <span className={cn(styles.person)}>
          <Avatar name={user.fullName} />
          <span className={cn(styles.personText)}>
            <strong className={cn(styles.name)}>{user.fullName}</strong>
            <span className={cn(styles.muted)}>{user.username}</span>
          </span>
        </span>
      ),
    },
    {
      id: 'role',
      header: t('users.columns.role'),
      cell: (user) => {
        const role = roleByUser.get(user.id) ?? null;
        return (
          <Chip tone={role === null ? 'sand' : 'aqua'}>
            {role === null ? t('users.noRole') : roleText(role.roleCode)}
          </Chip>
        );
      },
    },
    {
      id: 'status',
      header: t('users.columns.status'),
      cell: (user) => (
        <span className={cn(styles.statusCell)}>
          <Badge tone={statusTone(user.status)}>{statusText(user.status)}</Badge>
          {user.mustChangePassword ? (
            <span className={cn(styles.muted)}>{t('users.passwordPending')}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'activity',
      header: t('users.columns.activity'),
      hideOnNarrow: true,
      cell: (user) => (
        <span className={cn(styles.muted)}>
          {user.lastLoginAt === null
            ? t('users.neverLoggedIn')
            : t('users.lastLogin', { date: user.lastLoginAt.text })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('users.columns.actions'),
      align: 'end',
      cell: (user) => (
        <UserActions
          user={user}
          role={roleByUser.get(user.id) ?? null}
          onChanged={setNotice}
          onIssued={(grant: ResetGrantView) => {
            issue(
              t('users.codeResetTitle'),
              t('users.codeResetDescription'),
              grant.code,
              grant.expiresAt.text,
            );
          }}
        />
      ),
    },
  ];

  return (
    <div className={cn(styles.page)}>
      <ScreenTitle>{t('screens.users')}</ScreenTitle>
      <PageHeader
        lead={t('users.lead')}
        actions={
          <CreateUserDialog
            open={creating}
            onOpenChange={setCreating}
            trigger={<Button variant="primary">{t('users.create')}</Button>}
            onCreated={(created: CreatedUserView) => {
              issue(
                t('users.codeTitle'),
                t('users.codeDescription'),
                created.activationCode,
                created.expiresAt.text,
              );
            }}
          />
        }
      />
      <ul className={cn(styles.tiles)} aria-label={t('users.tilesLabel')}>
        <li>
          <StatTile icon={Users} tint="aqua" label={t('users.tiles.total')} value={items.length} />
        </li>
        <li>
          <StatTile
            icon={ShieldCheck}
            tint="mint"
            label={t('users.tiles.active')}
            value={activeCount}
          />
        </li>
        <li>
          <StatTile
            icon={CircleSlash}
            tint="sand"
            label={t('users.tiles.blocked')}
            value={blockedCount}
          />
        </li>
      </ul>
      {notice === null ? null : <p role="status">{notice}</p>}
      <DataTable
        caption={t('screens.users')}
        columns={columns}
        rows={items}
        getRowKey={(user) => user.id}
        empty={{ title: t('users.empty') }}
      />
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
    </div>
  );
}
