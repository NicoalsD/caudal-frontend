import { useSyncExternalStore } from 'react';
import type { JSX } from 'react';
import { LoaderCircle } from 'lucide-react';

import { t } from '../../i18n/t';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useOnline } from '../../state/hooks/useOnline';
import { cn } from '../../ui/styles/cn';
import styles from './ServerWakeNotice.module.css';

/**
 * One notice for the whole app while the API does not answer and the browser is online: the free
 * hosting plan puts it to sleep. Queries keep retrying meanwhile (core/policy/queryRetry), so the
 * screens wait instead of showing an error in every block. Offline, the offline notices apply.
 */
export function ServerWakeNotice(): JSX.Element | null {
  const { reachability } = useOfflineServices();
  const unreachable = useSyncExternalStore(
    reachability.subscribe,
    reachability.getSnapshot,
    reachability.getSnapshot,
  );
  const online = useOnline();
  return (
    <div aria-live="polite" aria-atomic="true" className={cn(styles.region)}>
      {unreachable && online ? (
        <p className={cn(styles.notice)}>
          <LoaderCircle aria-hidden="true" className={cn(styles.icon)} />
          {t('connection.serverWaking')}
        </p>
      ) : null}
    </div>
  );
}
