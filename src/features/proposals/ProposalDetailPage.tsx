import type { JSX } from 'react';
import { Link, useParams } from 'react-router';

import { formatServiceDate } from '../../core/format/serviceDate';
import { isBandCode } from '../../core/rules/ruleSetParts';
import { ROUTE_PATHS } from '../../core/session/routes';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useSectors } from '../../state/hooks/useSectors';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { hoursText } from './hoursText';
import { ProposalStatusChip } from './ProposalStatusChip';
import styles from './Proposals.module.css';
import { useProposal } from './proposalQueries';
import type { ScheduleItemView, ScheduleProposalView } from '../../services/api/views';

/** Screen S13 detail: each shift with its sector, times, hours and reasons in plain words. */
export function ProposalDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const proposal = useProposal(id);
  const sectors = useSectors();
  const rules = useCurrentRuleSet();

  const failed = proposal.isError || sectors.isError || rules.isError;
  if (failed) {
    const error = proposal.error ?? sectors.error ?? rules.error;
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
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }
  if (proposal.isPending || sectors.isPending || rules.isPending) {
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
