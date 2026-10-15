import type { JSX } from 'react';
import { Link, useNavigate } from 'react-router';

import { dayStepFor, currentProposalOf, type DayProposal } from '../../core/proposal/proposalDay';
import { ROUTE_PATHS } from '../../core/session/routes';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { usePermission } from '../../state/hooks/usePermission';
import { useOnline } from '../../state/hooks/useOnline';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { useGenerateProposal, useProposalsOfDay } from '../proposals/proposalQueries';
import { proposalDetailPath, publicationPath } from '../proposals/paths';
import styles from './BoardDayGuide.module.css';

/**
 * The Board's first step of the day, above the tank status (F088). It shows one next step only:
 * generate, review, publish, or the link to the published schedule.
 */
export function BoardDayGuide(): JSX.Element | null {
  const today = useServiceToday();
  const day = useProposalsOfDay(today);
  const generate = useGenerateProposal();
  const navigate = useNavigate();
  const canGenerate = usePermission('PROPOSAL_GENERATE');
  const online = useOnline();

  if (day.isPending) {
    return null;
  }
  if (day.isError) {
    return <FormAlert message={errorText(day.error).message} />;
  }

  const current = currentProposalOf(
    (day.data ?? []).map((view): DayProposal => ({
      id: view.id,
      serviceDate: view.serviceDate,
      status: view.status,
      generatedAt: view.generatedAt.date.getTime(),
    })),
  );
  const step = dayStepFor(current);
  const heading = <p className={cn(styles.heading)}>{t('proposals.guide.heading')}</p>;

  if (step === 'GENERATE') {
    return (
      <section className={cn(styles.guide)} aria-label={t('proposals.guide.heading')}>
        {heading}
        {canGenerate ? (
          <Button
            variant="primary"
            disabled={!online || generate.isPending}
            onClick={() => {
              generate.mutate(today);
            }}
          >
            {generate.isPending ? t('proposals.generating') : t('proposals.generate')}
          </Button>
        ) : (
          <p>{t('proposals.guide.noPermission')}</p>
        )}
        {generate.isError ? <FormAlert message={errorText(generate.error).message} /> : null}
      </section>
    );
  }

  if (step === 'PUBLISHED') {
    return (
      <section className={cn(styles.guide)} aria-label={t('proposals.guide.heading')}>
        {heading}
        <p>{t('proposals.guide.published')}</p>
        <Link className={cn(styles.link)} to={ROUTE_PATHS.board.publication}>
          {t('proposals.guide.publishedLink')}
        </Link>
      </section>
    );
  }

  const proposalId = current?.id ?? '';
  return (
    <section className={cn(styles.guide)} aria-label={t('proposals.guide.heading')}>
      {heading}
      {step === 'REVIEW' ? (
        <Button
          variant="primary"
          onClick={() => {
            void navigate(proposalDetailPath(proposalId));
          }}
        >
          {t('proposals.guide.review')}
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={() => {
            void navigate(publicationPath(proposalId));
          }}
        >
          {t('proposals.guide.publish')}
        </Button>
      )}
    </section>
  );
}
