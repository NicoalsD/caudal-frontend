import { Cloud, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import styles from './SyncStatusBar.module.css';

const ICON_SIZE = 20;

export interface SyncStatusBarProps {
  /** True when the browser reports a connection (ONLINE). */
  readonly online: boolean;
  readonly pendingCount: number;
  readonly sending: boolean;
  readonly needsReviewCount: number;
}

/**
 * Always visible in the signed-in screens (ux-guidelines section 7): where the readings are and
 * whether they have left the phone. Every state has an icon and a text, never color alone.
 */
export function SyncStatusBar({
  online,
  pendingCount,
  sending,
  needsReviewCount,
}: SyncStatusBarProps): JSX.Element {
  return (
    <section className={cn(styles.bar)} aria-label={t('sync.label')}>
      <ul className={cn(styles.list)}>
        <li className={cn(styles.item, online ? styles.good : styles.warning)}>
          {online ? (
            <Cloud aria-hidden="true" size={ICON_SIZE} />
          ) : (
            <CloudOff aria-hidden="true" size={ICON_SIZE} />
          )}
          <span>{online ? t('sync.online') : t('sync.offline')}</span>
        </li>
        {sending ? (
          <li className={cn(styles.item, styles.good)}>
            <RefreshCw aria-hidden="true" size={ICON_SIZE} />
            <span>{t('sync.sending')}</span>
          </li>
        ) : null}
        {pendingCount > 0 ? (
          <li className={cn(styles.item, online ? styles.good : styles.warning)}>
            <span>{t('sync.pending', { count: String(pendingCount) })}</span>
          </li>
        ) : null}
        {needsReviewCount > 0 ? (
          <li className={cn(styles.item, styles.attention)}>
            <TriangleAlert aria-hidden="true" size={ICON_SIZE} />
            <span>
              {needsReviewCount === 1
                ? t('sync.needsReviewOne')
                : t('sync.needsReviewMany', { count: String(needsReviewCount) })}
            </span>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
