import { useState } from 'react';
import type { JSX } from 'react';
import { Link, useSearchParams } from 'react-router';

import { formatServiceDate } from '../../core/format/serviceDate';
import {
  currentProposalOf,
  isPublishable,
  type DayProposal,
} from '../../core/proposal/proposalDay';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useOnline } from '../../state/hooks/useOnline';
import { usePermission } from '../../state/hooks/usePermission';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { Dialog } from '../../ui/primitives/Dialog';
import { cn } from '../../ui/styles/cn';
import type { ScheduleProposalSummaryView } from '../../services/api/views';
import styles from './Proposals.module.css';
import { ProposalStatusChip } from './ProposalStatusChip';
import { proposalDetailPath } from './paths';
import { useProposal, useProposalsOfDay, usePublishProposal } from './proposalQueries';

const PROPOSAL_PARAM = 'proposal';

/** Screen S15: publishes the approved schedule. Without `?proposal=` it uses the day's proposal. */
export function ProposalPublicationPage(): JSX.Element {
  const [params] = useSearchParams();
  const requestedId = params.get(PROPOSAL_PARAM);
  const today = useServiceToday();
  const day = useProposalsOfDay(today);
  const requested = useProposal(requestedId ?? '', requestedId !== null);

  if (requestedId !== null ? requested.isPending : day.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.publication')}</ScreenTitle>
        <LoadingState message={t('proposals.loading')} />
      </>
    );
  }
  if (requestedId !== null ? requested.isError : day.isError) {
    const error = requestedId !== null ? requested.error : day.error;
    return (
      <ErrorState
        title={t('screens.publication')}
        message={errorText(error).message}
        action={
          <Button
            onClick={() => {
              void (requestedId !== null ? requested.refetch() : day.refetch());
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const todays = day.data ?? [];
  const current = currentProposalOf(todays.map(toDayProposal));
  const proposal: ScheduleProposalSummaryView | null =
    requestedId !== null
      ? (requested.data ?? null)
      : (todays.find((item) => item.id === current?.id) ?? null);

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.publication')}</ScreenTitle>
      {proposal === null ? (
        <p>{t('proposals.publication.empty')}</p>
      ) : (
        <PublicationStatus proposal={proposal} />
      )}
    </div>
  );
}

function toDayProposal(view: ScheduleProposalSummaryView): DayProposal {
  return {
    id: view.id,
    serviceDate: view.serviceDate,
    status: view.status,
    generatedAt: view.generatedAt.date.getTime(),
  };
}

function PublicationStatus({
  proposal,
}: {
  readonly proposal: ScheduleProposalSummaryView;
}): JSX.Element {
  const online = useOnline();
  const canPublish = usePermission('SCHEDULE_PUBLISH');
  const publish = usePublishProposal();
  const [open, setOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const publishable = isPublishable(proposal.status);

  return (
    <section className={cn(styles.section)} aria-labelledby="publication-state-title">
      <h2 id="publication-state-title" className={cn(styles.heading)}>
        {formatServiceDate(proposal.serviceDate)}
      </h2>
      <ProposalStatusChip status={proposal.status} />
      <p>
        {proposal.status === 'PUBLISHED' || published
          ? t('proposals.publication.publishedState')
          : publishable
            ? t('proposals.publication.approvedState')
            : t('proposals.publication.notApproved')}
      </p>
      {publishable && canPublish ? (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title={t('proposals.publication.publish')}
          description={t('proposals.publication.confirmText')}
          trigger={
            <Button variant="primary" disabled={!online || publish.isPending}>
              {publish.isPending
                ? t('proposals.publication.publishing')
                : t('proposals.publication.publish')}
            </Button>
          }
        >
          <div className={cn(styles.actions)}>
            <Button
              variant="primary"
              disabled={publish.isPending}
              onClick={() => {
                publish.mutate(
                  { id: proposal.id, lockVersion: proposal.lockVersion },
                  {
                    onSuccess: () => {
                      setOpen(false);
                      setPublished(true);
                    },
                  },
                );
              }}
            >
              {t('proposals.publication.confirm')}
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              {t('proposals.editor.cancel')}
            </Button>
          </div>
        </Dialog>
      ) : null}
      {publish.isError ? (
        <FormAlert
          message={`${t('proposals.publication.failed')} ${errorText(publish.error).message}`}
        />
      ) : null}
      {publish.isSuccess || published ? (
        <p role="status">{t('proposals.publication.success')}</p>
      ) : null}
      {online ? null : <p>{t('proposals.offline')}</p>}
      <Link className={cn(styles.link)} to={proposalDetailPath(proposal.id)}>
        {t('proposals.publication.reviewLink')}
      </Link>
    </section>
  );
}
