import type { JSX } from 'react';

import { t } from '../../i18n/t';
import type { ProposalStatus } from '../../core/proposal/proposalDay';
import { cn } from '../../ui/styles/cn';
import styles from './Proposals.module.css';

interface ProposalStatusChipProps {
  readonly status: ProposalStatus;
}

/** The status in words (never only by colour): the chip text is the status name. */
export function ProposalStatusChip({ status }: ProposalStatusChipProps): JSX.Element {
  return <span className={cn(styles.chip)}>{t(`proposals.status.${status}`)}</span>;
}
