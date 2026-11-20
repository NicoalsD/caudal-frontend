/** Sort results: negative puts the first argument before the second. */
const BEFORE = -1;
const AFTER = 1;

/** Status of a schedule proposal (API.md 10, Reglas-de-negocio section 12). */
export const PROPOSAL_STATUSES = [
  'PENDING_REVIEW',
  'APPROVED',
  'APPROVED_WITH_CHANGES',
  'REJECTED',
  'PUBLISHED',
  'CLOSED',
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** The part of a proposal the day view needs: the list answers with exactly these fields. */
export interface DayProposal {
  readonly id: string;
  readonly serviceDate: string;
  readonly status: ProposalStatus;
  /** Instant of generation in epoch milliseconds: the newest one wins a tie. */
  readonly generatedAt: number;
}

/** What the Board has to do next with the day's proposal (F088 and the screens of phase 7). */
export type DayStep = 'GENERATE' | 'REVIEW' | 'PUBLISH' | 'PUBLISHED';

/** Only a proposal that waits for the Board can be approved, modified or rejected. */
export function isDecidable(status: ProposalStatus): boolean {
  return status === 'PENDING_REVIEW';
}

/** An approved proposal (with or without changes) can be published (API.md 10.7). */
export function isPublishable(status: ProposalStatus): boolean {
  return status === 'APPROVED' || status === 'APPROVED_WITH_CHANGES';
}

/**
 * The proposal that counts for a day: a rejected one does not, because the server then accepts a
 * new one. When there are several live ones, the most recently generated wins.
 */
export function currentProposalOf<T extends DayProposal>(proposals: readonly T[]): T | null {
  const live = proposals.filter((proposal) => proposal.status !== 'REJECTED');
  let latest: T | null = null;
  for (const proposal of live) {
    if (latest === null || proposal.generatedAt > latest.generatedAt) {
      latest = proposal;
    }
  }
  return latest;
}

/** The single next step of the day. `null` proposal means the day has nothing yet. */
export function dayStepFor(proposal: DayProposal | null): DayStep {
  if (proposal === null) {
    return 'GENERATE';
  }
  if (isDecidable(proposal.status)) {
    return 'REVIEW';
  }
  if (isPublishable(proposal.status)) {
    return 'PUBLISH';
  }
  return proposal.status === 'PUBLISHED' || proposal.status === 'CLOSED' ? 'PUBLISHED' : 'GENERATE';
}

/**
 * Orders the list for the Board: the proposal of `today` first, then the others from the most
 * recent service day to the oldest. The input is not changed.
 */
export function orderProposals<T extends DayProposal>(proposals: readonly T[], today: string): T[] {
  return [...proposals].sort((a, b) => {
    if (a.serviceDate === today && b.serviceDate !== today) {
      return BEFORE;
    }
    if (b.serviceDate === today && a.serviceDate !== today) {
      return AFTER;
    }
    if (a.serviceDate === b.serviceDate) {
      return b.generatedAt - a.generatedAt;
    }
    return a.serviceDate < b.serviceDate ? AFTER : BEFORE;
  });
}
