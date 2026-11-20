import type { JSX } from 'react';

import type { DecisionStatus } from '../../../core/autopilot/autopilotModel';
import type { LiveValve } from '../../../core/scene/sceneModel';
import type { CommandStatus } from '../../../core/valves/valveModel';
import { lower } from '../../../i18n/lower';
import { t } from '../../../i18n/t';
import { useDecisions } from '../../../state/hooks/useAutopilot';
import { useLiveCommands } from '../../../state/hooks/useLiveCommands';
import { usePermission } from '../../../state/hooks/usePermission';
import { Badge } from '../../../ui/primitives/Badge';
import type { BadgeTone } from '../../../ui/primitives/Badge';
import { cn } from '../../../ui/styles/cn';
import { decisionStatusText } from '../../autopilot/decisionText';
import { PERMISSION_ASSISTANT } from '../../aqueduct/permissions';
import { recommendationTitle } from '../../aqueduct/recommendationText';
import styles from './Console.module.css';

/** How many rows the queue shows: enough to follow the last moves, short enough to scan. */
const QUEUE_ROWS = 5;

const COMMAND_TONE: Readonly<Record<CommandStatus, BadgeTone>> = {
  PENDING: 'warning',
  DELIVERED: 'info',
  ACKED: 'ok',
  FAILED: 'error',
  EXPIRED: 'error',
};

const DECISION_TONE: Readonly<Record<DecisionStatus, BadgeTone>> = {
  PENDING: 'warning',
  ACCEPTED: 'info',
  EXECUTED: 'ok',
  REJECTED: 'neutral',
  EXPIRED: 'neutral',
  SKIPPED: 'neutral',
};

interface QueueRow {
  readonly id: string;
  readonly at: number;
  readonly tone: BadgeTone;
  readonly status: string;
  readonly title: string;
  readonly meta: string;
}

/**
 * The queue at the side of the scene: the last command of each valve (pending, delivered,
 * confirmed or failed, with its origin) and the pilot's latest decisions, newest first.
 */
export function ActionQueue({ valves }: { readonly valves: readonly LiveValve[] }): JSX.Element {
  const canRead = usePermission(PERMISSION_ASSISTANT);
  const commands = useLiveCommands(true);
  const decisions = useDecisions(undefined, canRead);

  const rows: QueueRow[] = [];
  for (const valve of valves) {
    const command = commands.get(valve.id);
    if (command === undefined) {
      continue;
    }
    rows.push({
      id: command.id,
      at: command.updatedAt.date.getTime(),
      tone: COMMAND_TONE[command.status],
      status: t(`console.commandStatus.${lower(command.status)}`),
      title: t('console.queueCommand', {
        action: t(`assistant.action.${lower(command.action)}`),
        valve: valve.name,
      }),
      meta: t('console.queueMeta', {
        origin: t(`console.origin.${lower(command.origin)}`),
        time: command.updatedAt.text,
      }),
    });
  }
  for (const decision of decisions.data ?? []) {
    // Pending ones lead the band; expired ones changed nothing in the field.
    if (decision.status === 'PENDING' || decision.status === 'EXPIRED') {
      continue;
    }
    rows.push({
      id: decision.id,
      at: (decision.decidedAt ?? decision.createdAt).date.getTime(),
      tone: DECISION_TONE[decision.status],
      status: decisionStatusText(decision.status),
      title: t('console.queueDecision', { title: recommendationTitle(decision, valves) }),
      meta: t('console.queueMeta', {
        origin: t('console.decisionOrigin'),
        time: (decision.decidedAt ?? decision.createdAt).text,
      }),
    });
  }
  const shown = rows.sort((a, b) => b.at - a.at).slice(0, QUEUE_ROWS);

  return (
    <section className={cn(styles.queue)} aria-labelledby="console-queue-title">
      <h2 id="console-queue-title" className={cn(styles.queueTitle)}>
        {t('console.queueTitle')}
      </h2>
      {shown.length === 0 ? (
        <p className={cn(styles.queueEmpty)}>{t('console.queueEmpty')}</p>
      ) : (
        <ol className={cn(styles.queueList)}>
          {shown.map((row) => (
            <li key={row.id} className={cn(styles.queueRow)}>
              <Badge tone={row.tone}>{row.status}</Badge>
              <p className={cn(styles.queueRowTitle)}>{row.title}</p>
              <p className={cn(styles.queueRowMeta)}>{row.meta}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
