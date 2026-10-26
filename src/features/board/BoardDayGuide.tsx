import type { JSX } from 'react';
import { Circle, CircleCheck, CircleDot, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

import {
  dayStepFor,
  currentProposalOf,
  type DayProposal,
  type DayStep,
} from '../../core/proposal/proposalDay';
import { ROUTE_PATHS } from '../../core/session/routes';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { usePermission } from '../../state/hooks/usePermission';
import { useOnline } from '../../state/hooks/useOnline';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { cn } from '../../ui/styles/cn';
import { useGenerateProposal, useProposalsOfDay } from '../proposals/proposalQueries';
import { proposalDetailPath, publicationPath } from '../proposals/paths';
import styles from './BoardDayGuide.module.css';

/** The steps the Board walks through each day. The API only tells these apart by proposal status. */
type GuideStepId = Exclude<DayStep, 'PUBLISHED'>;

const GUIDE_STEP_IDS: readonly GuideStepId[] = ['GENERATE', 'REVIEW', 'PUBLISH'];

const STEP_KEY = {
  GENERATE: 'proposals.guide.steps.generate',
  REVIEW: 'proposals.guide.steps.review',
  PUBLISH: 'proposals.guide.steps.publish',
} as const satisfies Record<GuideStepId, string>;

type StepState = 'done' | 'current' | 'pending';

const STATE_ICON: Readonly<Record<StepState, LucideIcon>> = {
  done: CircleCheck,
  current: CircleDot,
  pending: Circle,
};

/** The state is also written in words, so it never depends on the icon or colour alone. */
const STATE_KEY = {
  done: 'proposals.guide.state.done',
  current: 'proposals.guide.state.current',
  pending: 'proposals.guide.state.pending',
} as const satisfies Record<StepState, string>;

const ICON_SIZE = 20;

function stepStateOf(index: number, currentIndex: number): StepState {
  if (index < currentIndex) {
    return 'done';
  }
  return index === currentIndex ? 'current' : 'pending';
}

/**
 * The Board's day as a short list of steps (F088): what is done, what is the current step and
 * what is still missing. The current step has the only primary button of the block.
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
  const guide = (children: JSX.Element) => (
    <section className={cn(styles.guide)} aria-label={t('proposals.guide.heading')}>
      <h2 className={cn(styles.heading)}>{t('proposals.guide.heading')}</h2>
      {children}
    </section>
  );

  if (step === 'PUBLISHED') {
    return guide(
      <>
        <StepList currentIndex={GUIDE_STEP_IDS.length} />
        <p>{t('proposals.guide.published')}</p>
        <LinkButton
          variant="primary"
          className={cn(styles.action)}
          to={ROUTE_PATHS.board.publication}
        >
          {t('proposals.guide.publishedLink')}
        </LinkButton>
      </>,
    );
  }

  const proposalId = current?.id ?? '';
  return guide(
    <>
      <StepList currentIndex={GUIDE_STEP_IDS.indexOf(step)} />
      {step === 'GENERATE' ? (
        canGenerate ? (
          <Button
            variant="primary"
            className={cn(styles.action)}
            disabled={!online || generate.isPending}
            onClick={() => {
              generate.mutate(today);
            }}
          >
            {generate.isPending ? t('proposals.generating') : t('proposals.generate')}
          </Button>
        ) : (
          <p>{t('proposals.guide.noPermission')}</p>
        )
      ) : null}
      {step === 'REVIEW' ? (
        <Button
          variant="primary"
          className={cn(styles.action)}
          onClick={() => {
            void navigate(proposalDetailPath(proposalId));
          }}
        >
          {t('proposals.guide.review')}
        </Button>
      ) : null}
      {step === 'PUBLISH' ? (
        <Button
          variant="primary"
          className={cn(styles.action)}
          onClick={() => {
            void navigate(publicationPath(proposalId));
          }}
        >
          {t('proposals.guide.publish')}
        </Button>
      ) : null}
      {step === 'GENERATE' && !online ? <p>{t('proposals.offline')}</p> : null}
      {step === 'GENERATE' && generate.isError ? (
        <FormAlert message={errorText(generate.error).message} />
      ) : null}
    </>,
  );
}

interface StepListProps {
  /** Index of the current step; the number of steps when every step is done. */
  readonly currentIndex: number;
}

function StepList({ currentIndex }: StepListProps): JSX.Element {
  return (
    <ol className={cn(styles.steps)} aria-live="polite">
      {GUIDE_STEP_IDS.map((id, index) => {
        const state = stepStateOf(index, currentIndex);
        const Icon = STATE_ICON[state];
        return (
          <li
            key={id}
            className={cn(styles.step, styles[state])}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <Icon aria-hidden="true" size={ICON_SIZE} className={cn(styles.icon)} />
            <span className={cn(styles.label)}>{t(STEP_KEY[id])}</span>
            <span className={cn(styles.state)}>{t(STATE_KEY[state])}</span>
          </li>
        );
      })}
    </ol>
  );
}
