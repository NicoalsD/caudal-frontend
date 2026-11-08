import { currentProposalOf } from '../../core/proposal/proposalDay';
import type { DayProposal } from '../../core/proposal/proposalDay';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import type { ScheduleItemView } from '../../services/api/views';
import { useProposal, useProposalsOfDay } from '../proposals/proposalQueries';

/** Today's shifts, in the order of the proposal; empty until the day's proposal is known. */
export function useTodayShifts(): {
  readonly items: readonly ScheduleItemView[];
  readonly isPublished: boolean;
} {
  const today = useServiceToday();
  const day = useProposalsOfDay(today);
  const current = currentProposalOf(
    (day.data ?? []).map((view): DayProposal => ({
      id: view.id,
      serviceDate: view.serviceDate,
      status: view.status,
      generatedAt: view.generatedAt.date.getTime(),
    })),
  );
  const proposal = useProposal(current?.id ?? '', current !== null);
  const items = [...(proposal.data?.items ?? [])].sort((a, b) => a.sequence - b.sequence);
  return { items, isPublished: current?.status === 'PUBLISHED' };
}
