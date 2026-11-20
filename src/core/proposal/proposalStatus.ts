import { PROPOSAL_STATUSES, type ProposalStatus } from './proposalDay';

/** Narrows a status string from the API; an unknown value is a contract error, not a status. */
export function isProposalStatus(value: string): value is ProposalStatus {
  return (PROPOSAL_STATUSES as readonly string[]).includes(value);
}
