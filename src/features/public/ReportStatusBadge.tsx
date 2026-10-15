import type { JSX } from 'react';
import { BadgeCheck, CircleCheck, CircleX, Inbox, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { ReportStatus } from '../../core/incidents/reportStatus';
import { reportStatusTone } from '../../core/incidents/reportStatus';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import styles from './ReportStatus.module.css';

/** The icon of each status (the state's presentation lives here, next to the view). */
const ICON_BY_STATUS: Readonly<Record<ReportStatus, LucideIcon>> = {
  REPORTED: Inbox,
  VERIFYING: Search,
  CONFIRMED: BadgeCheck,
  RESOLVED: CircleCheck,
  DISMISSED: CircleX,
};

/** The text key of each status: es.ts keys are camelCase, the API names are not. */
export const STATUS_LABEL_KEY = {
  REPORTED: 'publicTracking.status.received',
  VERIFYING: 'publicTracking.status.verifying',
  CONFIRMED: 'publicTracking.status.confirmed',
  RESOLVED: 'publicTracking.status.resolved',
  DISMISSED: 'publicTracking.status.dismissed',
} as const satisfies Readonly<Record<ReportStatus, string>>;

interface ReportStatusBadgeProps {
  readonly status: ReportStatus;
}

/**
 * The status in plain words, with its icon and a tone class. The icon is decorative: the word
 * carries the meaning, so the status never depends on color alone.
 */
export function ReportStatusBadge({ status }: ReportStatusBadgeProps): JSX.Element {
  const Icon = ICON_BY_STATUS[status];
  return (
    <p className={cn(styles.badge, styles[reportStatusTone(status)])}>
      <Icon aria-hidden="true" className={cn(styles.icon)} />
      <span>{t(STATUS_LABEL_KEY[status])}</span>
    </p>
  );
}
