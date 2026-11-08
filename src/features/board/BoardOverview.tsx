import { useState } from 'react';
import type { JSX } from 'react';

import { currentProposalOf, isDecidable, type DayProposal } from '../../core/proposal/proposalDay';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { useAutopilotSettings } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { Button } from '../../ui/primitives/Button';
import { Dialog } from '../../ui/primitives/Dialog';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { cn } from '../../ui/styles/cn';
import { AssistantPanel } from '../aqueduct/AssistantPanel';
import { AutopilotModeControl } from '../aqueduct/AutopilotModeControl';
import { LiveAqueduct, SceneMessage } from '../aqueduct/LiveAqueduct';
import { PERMISSION_ASSISTANT } from '../aqueduct/permissions';
import { DecisionHistory } from '../autopilot';
import { proposalDetailPath } from '../proposals/paths';
import { useProposalsOfDay } from '../proposals/proposalQueries';
import { ReviewPanel } from './BoardConsole';
import { ReportCard } from './ReportCard';
import styles from './BoardOverview.module.css';

const NETWORK_PERMISSION = 'NETWORK_VIEW';

/**
 * Under the Board's console: a grid that fills the width on a desktop and is one column on a
 * phone. The small 3D scene (look only), what is pending, the pilot's record, the week's report
 * card and the assistant. Each card is left out when the person lacks the permission to read it.
 */
export function BoardOverview(): JSX.Element {
  const canSeeNetwork = usePermission(NETWORK_PERMISSION);
  return (
    <div className={cn(styles.grid)}>
      {canSeeNetwork ? (
        <LiveAqueduct readOnly>
          {(parts, live) => (
            <>
              <MiniScene scene={parts?.scene ?? null} live={live} />
              <PendingCard />
              <PilotCard />
              <ReportCard />
              <AssistantCard valves={parts?.aqueduct.valves ?? []} />
            </>
          )}
        </LiveAqueduct>
      ) : (
        <>
          <PendingCard />
          <PilotCard />
          <ReportCard />
        </>
      )}
    </div>
  );
}

function MiniScene({
  scene,
  live,
}: {
  readonly scene: JSX.Element | null;
  readonly live: Parameters<typeof SceneMessage>[0]['live'];
}): JSX.Element {
  const [big, setBig] = useState(false);
  return (
    <section className={cn(styles.card, styles.sceneCard)} aria-labelledby="board-scene-title">
      <h2 id="board-scene-title" className={cn(styles.cardTitle)}>
        {t('board.scene.title')}
      </h2>
      <div className={cn(styles.miniScene)}>{scene ?? <SceneMessage live={live} />}</div>
      {scene === null ? null : (
        <div className={cn(styles.actions)}>
          <Button
            onClick={() => {
              setBig(true);
            }}
          >
            {t('board.scene.open')}
          </Button>
        </div>
      )}
      <Dialog
        open={big}
        onOpenChange={setBig}
        title={t('board.scene.title')}
        description={t('board.scene.description')}
      >
        <div className={cn(styles.bigScene)}>
          {big ? (
            <LiveAqueduct readOnly>
              {(parts, innerLive) =>
                parts === null ? <SceneMessage live={innerLive} /> : parts.scene
              }
            </LiveAqueduct>
          ) : null}
        </div>
      </Dialog>
    </section>
  );
}

function PendingCard(): JSX.Element {
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
  const toReview = current !== null && isDecidable(current.status);
  return (
    <section className={cn(styles.card)} aria-labelledby="board-pending-title">
      <h2 id="board-pending-title" className={cn(styles.cardTitle)}>
        {t('board.pending.title')}
      </h2>
      <p>{toReview ? t('board.pending.proposal') : t('board.pending.noProposal')}</p>
      {toReview ? (
        <div className={cn(styles.actions)}>
          <LinkButton to={proposalDetailPath(current.id)}>{t('board.pending.review')}</LinkButton>
        </div>
      ) : null}
      <ReviewPanel />
    </section>
  );
}

function PilotCard(): JSX.Element | null {
  const allowed = usePermission(PERMISSION_ASSISTANT);
  const settings = useAutopilotSettings(allowed);
  if (!allowed) {
    return null;
  }
  return (
    <section className={cn(styles.card, styles.wide)} aria-labelledby="board-pilot-title">
      <h2 id="board-pilot-title" className={cn(styles.cardTitle)}>
        {t('board.pilot.title')}
      </h2>
      {settings.isSuccess ? (
        <p className={cn(styles.hint)}>
          {t('board.pilot.mode', {
            mode: t(
              `autopilot.mode.${settings.data.mode.toLowerCase() as Lowercase<typeof settings.data.mode>}`,
            ),
          })}
        </p>
      ) : null}
      <DecisionHistory compact maxRows={5} headingId="board-pilot-log" headingLevel="h3" />
      <div className={cn(styles.actions)}>
        <LinkButton to={ROUTE_PATHS.board.autopilot}>{t('board.pilot.open')}</LinkButton>
      </div>
    </section>
  );
}

function AssistantCard({
  valves,
}: {
  readonly valves: Parameters<typeof AssistantPanel>[0]['valves'];
}): JSX.Element | null {
  const allowed = usePermission(PERMISSION_ASSISTANT);
  if (!allowed) {
    return null;
  }
  return (
    <div className={cn(styles.card)}>
      <AutopilotModeControl />
      <AssistantPanel valves={valves} />
    </div>
  );
}
