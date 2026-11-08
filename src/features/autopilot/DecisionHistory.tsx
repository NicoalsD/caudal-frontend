import type { JSX } from 'react';

import { collectValves } from '../../core/devices/attachments';
import { formatDecimal } from '../../core/format/decimal';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { AutopilotDecisionView } from '../../services/api/views';
import { useDecisions } from '../../state/hooks/useAutopilot';
import { useNetwork } from '../../state/hooks/useNetwork';
import { usePermission } from '../../state/hooks/usePermission';
import { useSession } from '../../state/hooks/useSession';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { TableScroll } from '../../ui/primitives/TableScroll';
import { cn } from '../../ui/styles/cn';
import { PERMISSION_ASSISTANT } from '../aqueduct/permissions';
import { decisionDetailText, decisionStatusText } from './decisionText';
import styles from './Autopilot.module.css';

const PERCENT = 100;
const WHOLE = 0;

interface DecisionHistoryProps {
  /** Shows only the newest decisions, without the confidence and the reason column (dashboard). */
  readonly compact?: boolean;
  readonly maxRows?: number;
  readonly headingId: string;
  readonly headingLevel?: 'h2' | 'h3';
}

/**
 * The record of what the autopilot decided: when, where it came from (language model or rules),
 * what, which valve, why, how it ended and who settled it. Read-only; needs ASSISTANT_USE.
 */
export function DecisionHistory({
  compact = false,
  maxRows,
  headingId,
  headingLevel = 'h2',
}: DecisionHistoryProps): JSX.Element | null {
  const allowed = usePermission(PERMISSION_ASSISTANT);
  const decisions = useDecisions(undefined, allowed);
  const network = useNetwork();
  const session = useSession();
  const Heading = headingLevel;
  if (!allowed) {
    return null;
  }

  const valveNames = new Map(
    (network.status === 'ready' ? collectValves(network.root) : []).map(
      (valve) => [valve.id, valve.name] as const,
    ),
  );
  const currentUserId = session.status === 'authenticated' ? session.user.userId : null;
  const rows = (decisions.data ?? []).slice(0, maxRows);

  let body: JSX.Element;
  if (decisions.isPending) {
    body = <LoadingState message={t('history.loading')} />;
  } else if (decisions.isError) {
    body = <p role="alert">{t('history.error')}</p>;
  } else if (rows.length === 0) {
    body = <p className={cn(styles.quiet)}>{t('history.empty')}</p>;
  } else {
    body = (
      <TableScroll label={t('history.title')}>
        <table className={cn(styles.table)}>
          <thead>
            <tr>
              <th scope="col">{t('history.columns.when')}</th>
              <th scope="col">{t('history.columns.source')}</th>
              <th scope="col">{t('history.columns.action')}</th>
              <th scope="col">{t('history.columns.valve')}</th>
              {compact ? null : <th scope="col">{t('history.columns.reason')}</th>}
              <th scope="col">{t('history.columns.status')}</th>
              <th scope="col">{t('history.columns.decidedBy')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((decision) => (
              <DecisionRow
                key={decision.id}
                decision={decision}
                compact={compact}
                valveName={
                  decision.valveId === null ? null : (valveNames.get(decision.valveId) ?? null)
                }
                currentUserId={currentUserId}
              />
            ))}
          </tbody>
        </table>
      </TableScroll>
    );
  }

  return (
    <section className={cn(styles.section)} aria-labelledby={headingId}>
      <Heading id={headingId} className={cn(styles.sectionTitle)}>
        {compact ? t('history.recentTitle') : t('history.title')}
      </Heading>
      {body}
    </section>
  );
}

function DecisionRow({
  decision,
  compact,
  valveName,
  currentUserId,
}: {
  readonly decision: AutopilotDecisionView;
  readonly compact: boolean;
  readonly valveName: string | null;
  readonly currentUserId: string | null;
}): JSX.Element {
  const detail = decisionDetailText(decision.statusDetail);
  return (
    <tr>
      <td>{decision.createdAt.text}</td>
      <td>
        {t(`assistant.source.${lower(decision.source)}`)}
        <span className={cn(styles.meta)}>
          {t('history.confidence', {
            percent: formatDecimal(decision.confidence * PERCENT, WHOLE),
          })}
        </span>
      </td>
      <td>{t(`assistant.action.${lower(decision.action)}`)}</td>
      <td>{valveName ?? t('history.noValve')}</td>
      {compact ? null : <td className={cn(styles.wrap)}>{decision.reason}</td>}
      <td>
        {decisionStatusText(decision.status)}
        {detail === null ? null : <span className={cn(styles.meta)}>{detail}</span>}
      </td>
      <td>{deciderText(decision, currentUserId)}</td>
    </tr>
  );
}

/**
 * Who settled a decision. The server sends an id and a Board member cannot read the users, so the
 * screen says "Tú" for the person signed in and a plain phrase for anyone else.
 */
function deciderText(decision: AutopilotDecisionView, currentUserId: string | null): string {
  if (decision.decidedBy !== null) {
    return decision.decidedBy === currentUserId ? t('history.byYou') : t('history.byPerson');
  }
  if (decision.status === 'EXECUTED') {
    return t('history.byPilot');
  }
  return t('history.nobody');
}
