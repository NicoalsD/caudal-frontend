import { Archive, CheckCheck, CircleX, Clock, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import type { ProposalStatus } from '../../core/proposal/proposalDay';
import { cn } from '../../ui/styles/cn';
import styles from './Proposals.module.css';

interface ProposalStatusChipProps {
  readonly status: ProposalStatus;
}

const STATUS_KEY = {
  PENDING_REVIEW: 'pendingReview',
  APPROVED: 'approved',
  APPROVED_WITH_CHANGES: 'approvedWithChanges',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  CLOSED: 'closed',
} as const satisfies Record<ProposalStatus, string>;

const ICON_SIZE = 18;

/** Each status has its own icon and tone: attention waits for the Board, correct is decided. */
const STATUS_LOOK: Readonly<
  Record<ProposalStatus, { icon: LucideIcon; tone: string | undefined }>
> = {
  PENDING_REVIEW: { icon: Clock, tone: styles.toneAttention },
  APPROVED: { icon: CheckCheck, tone: styles.toneCorrect },
  APPROVED_WITH_CHANGES: { icon: CheckCheck, tone: styles.toneCorrect },
  REJECTED: { icon: CircleX, tone: styles.toneDanger },
  PUBLISHED: { icon: Send, tone: styles.toneInfo },
  CLOSED: { icon: Archive, tone: styles.toneNeutral },
};

/** The status in words (never only by colour): the icon is decorative, the text is the status. */
export function ProposalStatusChip({ status }: ProposalStatusChipProps): JSX.Element {
  const { icon: Icon, tone } = STATUS_LOOK[status];
  return (
    <span className={cn(styles.status, tone)}>
      <Icon aria-hidden="true" size={ICON_SIZE} />
      {t(`proposals.status.${STATUS_KEY[status]}`)}
    </span>
  );
}
