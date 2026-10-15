import { useState } from 'react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { useSessionActions } from '../../state/hooks/sessionActionsContext';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { Dialog } from '../../ui/primitives/Dialog';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './SignOut.module.css';

const ONE_ITEM = 1;

/**
 * Sign out. When this phone still holds readings of the signed-in person that have not reached the
 * server, it asks first (offline-sync.md 8.3). The queue survives the sign out either way.
 */
export function SignOutButton(): JSX.Element {
  const actions = useSessionActions();
  const summary = useSyncQueue();
  const [confirming, setConfirming] = useState(false);
  const unsent = summary.pendingCount + summary.needsReviewCount;
  const signOut = (): void => {
    void actions.logout();
  };

  if (unsent === 0) {
    return <Button onClick={signOut}>{t('auth.signOut')}</Button>;
  }
  return (
    <Dialog
      open={confirming}
      onOpenChange={setConfirming}
      title={t('sync.signOutTitle')}
      description={
        unsent === ONE_ITEM
          ? t('sync.signOutOneUnsent')
          : t('sync.signOutManyUnsent', { count: String(unsent) })
      }
      trigger={<Button>{t('auth.signOut')}</Button>}
    >
      <div className={cn(styles.actions)}>
        <Button
          variant="primary"
          onClick={() => {
            setConfirming(false);
          }}
        >
          {t('sync.signOutStay')}
        </Button>
        <Button onClick={signOut}>{t('sync.signOutConfirm')}</Button>
      </div>
    </Dialog>
  );
}
