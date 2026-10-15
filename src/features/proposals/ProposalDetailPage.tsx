import type { JSX } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { formatServiceDate } from '../../core/format/serviceDate';
import { isDecidable, isPublishable } from '../../core/proposal/proposalDay';
import { isBandCode } from '../../core/rules/ruleSetParts';
import { ROUTE_PATHS } from '../../core/session/routes';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useConstraints } from '../../state/hooks/useConstraints';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useOnline } from '../../state/hooks/useOnline';
import { usePermission } from '../../state/hooks/usePermission';
import { useSectors } from '../../state/hooks/useSectors';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { ApproveDialog, RejectDialog } from './ProposalDecisionDialogs';
import { hoursText } from './hoursText';
import { unservedReasonText } from './unservedMessages';
import { ProposalStatusChip } from './ProposalStatusChip';
import styles from './Proposals.module.css';
import { useApproveProposal, useProposal, useRejectProposal } from './proposalQueries';
import { proposalEditPath, publicationPath } from './paths';
import type { ScheduleItemView, ScheduleProposalView } from '../../services/api/views';

/** Screen S13 detail: each shift with its sector, times, hours and reasons in plain words. */
export function ProposalDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const proposal = useProposal(id);
  const sectors = useSectors();
  const rules = useCurrentRuleSet();
  const constraints = useConstraints();

  const failed = proposal.isError || sectors.isError || rules.isError || constraints.isError;
  if (failed) {
    const error = proposal.error ?? sectors.error ?? rules.error ?? constraints.error;
    return (
      <ErrorState
        title={t('screens.proposalDetail')}
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
        <ScreenTitle>{t('screens.proposalDetail')}</ScreenTitle>
        <LoadingState message={t('proposals.loadingDetail')} />
      </>
    );
  }

  const nameBySector = new Map(sectors.data.map((sector) => [sector.id, sector.name]));
  const prioritySectors = new Set(
    rules.data.sectors.filter((setting) => setting.isPriority).map((setting) => setting.sectorId),
  );

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.proposalDetail')}</ScreenTitle>
      <Link className={cn(styles.link)} to={ROUTE_PATHS.board.proposals}>
        {t('proposals.backToList')}
      </Link>
      <ProposalHeader proposal={proposal.data} />
      <ProposalActions
        proposal={proposal.data}
        reasonMin={constraints.data.reason?.min ?? 0}
        reasonMax={constraints.data.reason?.max ?? 0}
      />
      <section className={cn(styles.section)} aria-labelledby="proposal-unserved-title">
        <h2 id="proposal-unserved-title" className={cn(styles.heading)}>
          {t('proposals.unserved.title')}
        </h2>
        {proposal.data.unservedSectors.length === 0 ? (
          <p>{t('proposals.unserved.empty')}</p>
        ) : (
          <ul className={cn(styles.list)}>
            {proposal.data.unservedSectors.map((sector) => (
              <li key={sector.sectorId} className={cn(styles.item)}>
                <p className={cn(styles.heading)}>
                  {nameBySector.get(sector.sectorId) ?? t('proposals.unknownSector')}
                </p>
                <p>{unservedReasonText(sector.reason)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={cn(styles.section)} aria-labelledby="proposal-shifts-title">
        <h2 id="proposal-shifts-title" className={cn(styles.heading)}>
          {t('proposals.shiftsTitle')}
        </h2>
        {proposal.data.items.length === 0 ? (
          <p>{t('proposals.noShifts')}</p>
        ) : (
          <ol className={cn(styles.list)}>
            {proposal.data.items.map((item) => (
              <li key={item.id} className={cn(styles.item)}>
                <ShiftExplanation
                  item={item}
                  name={nameBySector.get(item.sectorId) ?? t('proposals.unknownSector')}
                  priority={prioritySectors.has(item.sectorId)}
                />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

interface ProposalActionsProps {
  readonly proposal: ScheduleProposalView;
  readonly reasonMin: number;
  readonly reasonMax: number;
}

/**
 * The Board's decisions (S13). Approve is the main action; modify and reject are secondary. Every
 * action needs the connection, and each one is only offered when the server would accept it.
 */
function ProposalActions({ proposal, reasonMin, reasonMax }: ProposalActionsProps): JSX.Element {
  const navigate = useNavigate();
  const online = useOnline();
  const canDecide = usePermission('PROPOSAL_DECIDE');
  const canPublish = usePermission('SCHEDULE_PUBLISH');
  const approve = useApproveProposal();
  const reject = useRejectProposal();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const decidable = isDecidable(proposal.status);
  const publishable = isPublishable(proposal.status);
  const shifts = proposal.items.length;
  const hours = proposal.items.reduce((sum, item) => sum + item.hours, 0);

  if (!decidable && !(publishable && canPublish)) {
    return <></>;
  }
  return (
    <section className={cn(styles.actions)} aria-label={t('proposals.shiftsTitle')}>
      {decidable && canDecide ? (
        <>
          <ApproveDialog
            trigger={
              <Button variant="primary" disabled={!online}>
                {t('proposals.actions.approve')}
              </Button>
            }
            open={approveOpen}
            onOpenChange={setApproveOpen}
            summary={t('proposals.approve.summary', {
              date: formatServiceDate(proposal.serviceDate),
              sectors: String(shifts),
              hours: hoursText(hours),
            })}
            isSaving={approve.isPending}
            failure={approve.isError ? errorText(approve.error).message : null}
            onConfirm={() => {
              approve.mutate(
                { id: proposal.id, lockVersion: proposal.lockVersion },
                {
                  onSuccess: () => {
                    setApproveOpen(false);
                    void navigate(publicationPath(proposal.id));
                  },
                },
              );
            }}
          />
          <Button
            disabled={!online}
            onClick={() => {
              void navigate(proposalEditPath(proposal.id));
            }}
          >
            {t('proposals.actions.modify')}
          </Button>
          <RejectDialog
            trigger={<Button disabled={!online}>{t('proposals.actions.reject')}</Button>}
            open={rejectOpen}
            onOpenChange={setRejectOpen}
            reasonMin={reasonMin}
            reasonMax={reasonMax}
            isSaving={reject.isPending}
            failure={reject.isError ? errorText(reject.error).message : null}
            onConfirm={(reason) => {
              reject.mutate(
                { id: proposal.id, lockVersion: proposal.lockVersion, reason },
                {
                  onSuccess: () => {
                    setRejectOpen(false);
                    void navigate(ROUTE_PATHS.board.proposals);
                  },
                },
              );
            }}
          />
        </>
      ) : null}
      {publishable && canPublish ? (
        <Button
          variant="primary"
          disabled={!online}
          onClick={() => {
            void navigate(publicationPath(proposal.id));
          }}
        >
          {t('proposals.actions.publish')}
        </Button>
      ) : null}
      {online ? null : <p>{t('proposals.offline')}</p>}
    </section>
  );
}

function ProposalHeader({ proposal }: { readonly proposal: ScheduleProposalView }): JSX.Element {
  const band = proposal.tankBand;
  const bandText =
    band !== null && isBandCode(band) ? t(`proposals.bandName.${band}`) : (band ?? '');
  return (
    <section className={cn(styles.section)} aria-labelledby="proposal-day-title">
      <h2 id="proposal-day-title" className={cn(styles.heading)}>
        {formatServiceDate(proposal.serviceDate)}
      </h2>
      <ProposalStatusChip status={proposal.status} />
      <p>
        {t('proposals.availableBand', {
          hours: hoursText(proposal.availableHours.value),
          band: bandText,
        })}
      </p>
      {proposal.tankLevel === null ? null : (
        <p className={cn(styles.meta)}>
          {t('proposals.tankLevel', { level: proposal.tankLevel.text })}
        </p>
      )}
      <p className={cn(styles.meta)}>
        {t('proposals.generatedOn', { date: proposal.generatedAt.text })}
      </p>
    </section>
  );
}

interface ShiftExplanationProps {
  readonly item: ScheduleItemView;
  readonly name: string;
  readonly priority: boolean;
}

function ShiftExplanation({ item, name, priority }: ShiftExplanationProps): JSX.Element {
  return (
    <>
      <h3 className={cn(styles.heading)}>{name}</h3>
      {priority ? <ProposalPriorityMark /> : null}
      {item.origin === 'PROPOSED' ? null : (
        <p className={cn(styles.meta)}>
          {item.origin === 'ADDED' ? t('proposals.originAdded') : t('proposals.originModified')}
        </p>
      )}
      <p>{t('proposals.shiftRange', { start: item.startTime, end: item.endTime })}</p>
      <p className={cn(styles.meta)}>{hoursText(item.hours)}</p>
      {item.reasons.length === 0 ? (
        <p className={cn(styles.meta)}>{t('proposals.noReasons')}</p>
      ) : (
        <ul className={cn(styles.reasons)}>
          {item.reasons.map((reason, index) => (
            <li key={`${reason.code}-${String(index)}`}>{reason.text}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function ProposalPriorityMark(): JSX.Element {
  return <span className={cn(styles.chip)}>{t('proposals.prioritySector')}</span>;
}
