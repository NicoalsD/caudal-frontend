import type { JSX } from 'react';

import { t } from '../../i18n/t';
import type { ProposalStatus } from '../../core/proposal/proposalDay';
import { Badge } from '../../ui/primitives/Badge';
import type { BadgeTone } from '../../ui/primitives/Badge';

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

/** Each status has its own tone: attention waits for the Board, correct is decided. */
const STATUS_TONE: Readonly<Record<ProposalStatus, BadgeTone>> = {
  PENDING_REVIEW: 'warning',
  APPROVED: 'ok',
  APPROVED_WITH_CHANGES: 'ok',
  REJECTED: 'error',
  PUBLISHED: 'info',
  CLOSED: 'neutral',
};

/** The status in words (never only by colour): the badge adds its icon, the text is the status. */
export function ProposalStatusChip({ status }: ProposalStatusChipProps): JSX.Element {
  return <Badge tone={STATUS_TONE[status]}>{t(`proposals.status.${STATUS_KEY[status]}`)}</Badge>;
}
