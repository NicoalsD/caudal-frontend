import { useEffect } from 'react';
import type { JSX } from 'react';

import { useConnection } from '../../state/hooks/useConnection';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useSession } from '../../state/hooks/useSession';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { SyncStatusBar } from '../../ui/feedback/SyncStatusBar';

/** Connects the status bar to the connection and to the queue of the signed-in person. */
export function SyncStatus(): JSX.Element | null {
  const session = useSession();
  const { syncQueue } = useOfflineServices();
  const connection = useConnection();
  const summary = useSyncQueue();
  const owner =
    session.status === 'authenticated'
      ? { userId: session.user.userId, aqueductId: session.user.aqueductId }
      : null;
  const ownerKey = owner === null ? null : `${owner.userId}@${owner.aqueductId}`;

  useEffect(() => {
    syncQueue.setOwner(owner);
    // The owner is identified by its key: a new object with the same ids is the same owner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey]);

  if (owner === null) {
    return null;
  }
  return (
    <SyncStatusBar
      online={connection === 'ONLINE'}
      pendingCount={summary.pendingCount}
      sending={summary.sendingCount > 0}
      needsReviewCount={summary.needsReviewCount}
    />
  );
}
