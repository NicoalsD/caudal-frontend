import { Bell } from 'lucide-react';
import type { JSX } from 'react';
import { Link } from 'react-router';

import { ROUTE_PATHS } from '../../../core/session/routes';
import { t } from '../../../i18n/t';
import { useOpenAnomalies } from '../../../state/hooks/useAnomalies';
import { useDecisions } from '../../../state/hooks/useAutopilot';
import { usePermission } from '../../../state/hooks/usePermission';
import { IconButton } from '../../../ui/primitives/IconButton';
import { Popover } from '../../../ui/primitives/Popover';
import { cn } from '../../../ui/styles/cn';
import styles from './TopBar.module.css';

const ONE = 1;

/**
 * Bell with the count of what waits for a person: open anomalies to review and pending
 * recommendations of the assistant. It only appears for people who may act on either, and the
 * count is also in the accessible name, so the dot is never the only signal.
 */
export function NotificationBell(): JSX.Element | null {
  const canReview = usePermission('ANOMALY_REVIEW');
  const canAssist = usePermission('ASSISTANT_USE');
  const anomalies = useOpenAnomalies(canReview);
  const decisions = useDecisions('PENDING', canAssist);
  const anomalyCount = canReview ? (anomalies.data?.items.length ?? 0) : 0;
  const decisionCount = canAssist ? (decisions.data?.length ?? 0) : 0;
  const total = anomalyCount + decisionCount;

  if (!canReview && !canAssist) {
    return null;
  }
  const label =
    total === 0
      ? t('shell.notificationsNone')
      : total === ONE
        ? t('shell.notificationsOne')
        : t('shell.notificationsMany', { count: String(total) });
  return (
    <Popover
      label={t('shell.notifications')}
      align="end"
      renderTrigger={(trigger) => (
        <IconButton label={label} {...trigger} badge={total === 0 ? undefined : String(total)}>
          <Bell aria-hidden="true" />
        </IconButton>
      )}
    >
      {total === 0 ? (
        <p className={cn(styles.allClear)}>{t('shell.allClear')}</p>
      ) : (
        <ul className={cn(styles.notices)}>
          {anomalyCount > 0 && (
            <li>
              <Link className={cn(styles.notice)} to={ROUTE_PATHS.board.tank}>
                {anomalyCount === ONE
                  ? t('shell.anomaliesOne')
                  : t('shell.anomaliesMany', { count: String(anomalyCount) })}
              </Link>
            </li>
          )}
          {decisionCount > 0 && (
            <li>
              <Link className={cn(styles.notice)} to={ROUTE_PATHS.board.autopilot}>
                {decisionCount === ONE
                  ? t('shell.decisionsOne')
                  : t('shell.decisionsMany', { count: String(decisionCount) })}
              </Link>
            </li>
          )}
        </ul>
      )}
    </Popover>
  );
}
