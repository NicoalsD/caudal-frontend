import type { JSX } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { isDecidable } from '../../core/proposal/proposalDay';
import type { ProposalEditorInput } from '../../core/proposal/ProposalEditorMediator';
import { ROUTE_PATHS } from '../../core/session/routes';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useConstraints } from '../../state/hooks/useConstraints';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useSectors } from '../../state/hooks/useSectors';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import type { EditorBounds } from './editorMessages';
import styles from './Proposals.module.css';
import { ProposalEditorForm } from './ProposalEditorForm';
import { useModifyProposal, useProposal } from './proposalQueries';
import { proposalDetailPath } from './paths';
import type { EditedShift } from '../../core/proposal/ProposalEditorMediator';
import type { EditorSubmit } from './ProposalEditorForm';

const REASON_CONSTRAINT = 'reason';

/** Screen S14: change the hours of a pending proposal, with a reason. */
export function ProposalEditorPage(): JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const modify = useModifyProposal();
  const proposal = useProposal(id);
  const sectors = useSectors();
  const rules = useCurrentRuleSet();
  const constraints = useConstraints();

  const failed = proposal.isError || sectors.isError || rules.isError || constraints.isError;
  if (failed) {
    const error = proposal.error ?? sectors.error ?? rules.error ?? constraints.error;
    return (
      <ErrorState
        title={t('screens.proposalEdit')}
        message={errorText(error).message}
        action={
          <Button
            onClick={() => {
              void proposal.refetch();
              void sectors.refetch();
              void rules.refetch();
              void constraints.refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }
  if (proposal.isPending || sectors.isPending || rules.isPending || constraints.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.proposalEdit')}</ScreenTitle>
        <LoadingState message={t('proposals.loadingDetail')} />
      </>
    );
  }

  const reasonLimits = constraints.data[REASON_CONSTRAINT];
  if (reasonLimits?.min === undefined || reasonLimits.max === undefined) {
    return (
      <ErrorState
        title={t('screens.proposalEdit')}
        message={t('proposals.editor.limitsUnavailable')}
      />
    );
  }
  if (!isDecidable(proposal.data.status)) {
    return (
      <>
        <ScreenTitle>{t('screens.proposalEdit')}</ScreenTitle>
        <p>{t('proposals.editor.readOnly')}</p>
        <Link className={cn(styles.link)} to={ROUTE_PATHS.board.proposals}>
          {t('proposals.backToList')}
        </Link>
      </>
    );
  }

  const day = proposal.data;
  const rule = rules.data;
  const bounds: EditorBounds = {
    availableHours: day.availableHours.value,
    minShiftHours: rule.minShiftHours,
    maxShiftHours: rule.maxShiftHours,
    reasonMin: reasonLimits.min,
    reasonMax: reasonLimits.max,
  };
  const input: ProposalEditorInput = {
    serviceDate: day.serviceDate,
    startMinutes: day.items[0]?.startMinutes ?? 0,
    shifts: day.items.map((item) => ({ sectorId: item.sectorId, hours: item.hours })),
    limits: {
      availableHours: bounds.availableHours,
      minShiftHours: bounds.minShiftHours,
      maxShiftHours: bounds.maxShiftHours,
      operatingWindows: rule.operatingWindows ?? [],
      reasonMin: bounds.reasonMin,
      reasonMax: bounds.reasonMax,
    },
  };

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.proposalEdit')}</ScreenTitle>
      <ProposalEditorForm
        input={input}
        sectorNames={new Map(sectors.data.map((sector) => [sector.id, sector.name]))}
        bounds={bounds}
        isSaving={modify.isPending}
        failure={modify.isError ? errorText(modify.error).message : null}
        onSubmit={(submit: EditorSubmit) => {
          const ids = new Map(day.items.map((item) => [item.sectorId, item.id]));
          const items = submit.mediator
            .toEditedShifts()
            .map((shift: EditedShift) => ({ ...shift, id: ids.get(shift.sectorId) ?? null }));
          modify.mutate(
            { id: day.id, lockVersion: day.lockVersion, reason: submit.state.reason, items },
            {
              onSuccess: () => {
                void navigate(proposalDetailPath(day.id));
              },
            },
          );
        }}
        onCancel={() => {
          void navigate(proposalDetailPath(day.id));
        }}
      />
    </div>
  );
}
