import type { JSX } from 'react';
import { Link } from 'react-router';

import {
  currentProposalOf,
  isDecidable,
  isPublishable,
  orderProposals,
  type DayProposal,
} from '../../core/proposal/proposalDay';
import { formatServiceDate } from '../../core/format/serviceDate';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { usePermission } from '../../state/hooks/usePermission';
import { useOnline } from '../../state/hooks/useOnline';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { cn } from '../../ui/styles/cn';
import { proposalDetailPath, publicationPath } from './paths';
import { ProposalStatusChip } from './ProposalStatusChip';
import styles from './Proposals.module.css';
import { useGenerateProposal, useProposalList } from './proposalQueries';
import type { ScheduleProposalSummaryView } from '../../services/api/views';

/** Screen S13: the proposals waiting for the Board, today's first (API.md section 10). */
export function ProposalListPage(): JSX.Element {
  const today = useServiceToday();
  const list = useProposalList();
  const generate = useGenerateProposal();
  const canGenerate = usePermission('PROPOSAL_GENERATE');
  const online = useOnline();

  if (list.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.proposals')}</ScreenTitle>
        <LoadingState message={t('proposals.loading')} />
      </>
    );
  }
  if (list.isError) {
    return (
      <ErrorState
        title={t('screens.proposals')}
        message={errorText(list.error).message}
        action={
          <Button
            onClick={() => {
              void list.refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const views = list.data.pages.flatMap((page) => page.items);
  const byId = new Map(views.map((view) => [view.id, view]));
  const items = views.map(toDayProposal);
  const todayProposal = currentProposalOf(items.filter((item) => item.serviceDate === today));
  const others = orderProposals(items, today)
    .filter((item) => item.id !== todayProposal?.id)
    .map((item) => byId.get(item.id))
    .filter((view): view is ScheduleProposalSummaryView => view !== undefined);
  const todayView = todayProposal === null ? null : (byId.get(todayProposal.id) ?? null);
  const canAct = canGenerate && online;

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.proposals')}</ScreenTitle>
      <section
        className={cn(styles.section, todayView !== null && styles.highlight)}
        aria-labelledby="proposal-today-title"
      >
        <h2 id="proposal-today-title" className={cn(styles.heading)}>
          {t('proposals.today')}
        </h2>
        {todayView === null ? (
          <p>{t('proposals.todayEmpty')}</p>
        ) : (
          <ProposalSummary proposal={todayView} emphasis />
        )}
        {todayProposal === null && canGenerate ? (
          <div className={cn(styles.actions)}>
            <Button
              variant="primary"
              disabled={!canAct || generate.isPending}
              onClick={() => {
                generate.mutate(today);
              }}
            >
              {generate.isPending ? t('proposals.generating') : t('proposals.generate')}
            </Button>
          </div>
        ) : null}
        {!online ? <p>{t('proposals.offline')}</p> : null}
        {generate.isError ? <FormAlert message={errorText(generate.error).message} /> : null}
        {generate.isSuccess ? <p role="status">{t('proposals.generated')}</p> : null}
      </section>
      <section className={cn(styles.section)} aria-labelledby="proposal-others-title">
        <h2 id="proposal-others-title" className={cn(styles.heading)}>
          {t('proposals.others')}
        </h2>
        {others.length === 0 ? (
          <p>{t('proposals.emptyList')}</p>
        ) : (
          <ul className={cn(styles.list)}>
            {others.map((item) => (
              <li key={item.id} className={cn(styles.item)}>
                <ProposalSummary proposal={item} showDay />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** The fields the day rules read, from the view (the instant as epoch milliseconds). */
function toDayProposal(view: ScheduleProposalSummaryView): DayProposal {
  return {
    id: view.id,
    serviceDate: view.serviceDate,
    status: view.status,
    generatedAt: view.generatedAt.date.getTime(),
  };
}

interface ProposalSummaryProps {
  readonly proposal: ScheduleProposalSummaryView;
  /** Other days show their date in the heading; today's block does not need it. */
  readonly showDay?: boolean;
  /** Today's block: a proposal that waits for the Board, or is approved, gets the primary action. */
  readonly emphasis?: boolean;
}

function ProposalSummary({
  proposal,
  showDay = false,
  emphasis = false,
}: ProposalSummaryProps): JSX.Element {
  return (
    <>
      {showDay ? (
        <p className={cn(styles.heading)}>{formatServiceDate(proposal.serviceDate)}</p>
      ) : null}
      <ProposalStatusChip status={proposal.status} />
      <p className={cn(styles.meta)}>
        {t('proposals.availableHours', { hours: proposal.availableHours.text })}
      </p>
      <p className={cn(styles.meta)}>
        {t('proposals.generatedOn', { date: proposal.generatedAt.text })}
      </p>
      <NextLink proposal={proposal} emphasis={emphasis} />
    </>
  );
}

/** The one action a proposal invites: review it while it waits, publish it once it is approved. */
function NextLink({
  proposal,
  emphasis,
}: {
  readonly proposal: ScheduleProposalSummaryView;
  readonly emphasis: boolean;
}): JSX.Element {
  if (emphasis && isDecidable(proposal.status)) {
    return (
      <LinkButton variant="primary" to={proposalDetailPath(proposal.id)}>
        {t('proposals.open')}
      </LinkButton>
    );
  }
  if (emphasis && isPublishable(proposal.status)) {
    return (
      <LinkButton variant="primary" to={publicationPath(proposal.id)}>
        {t('proposals.actions.publish')}
      </LinkButton>
    );
  }
  return (
    <Link className={cn(styles.link)} to={proposalDetailPath(proposal.id)}>
      {t('proposals.open')}
    </Link>
  );
}
