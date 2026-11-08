import { useState } from 'react';
import type { JSX } from 'react';

import { collectValves } from '../../core/devices/attachments';
import type { DecisionStatus } from '../../core/autopilot/autopilotModel';
import { formatDecimal } from '../../core/format/decimal';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { AutopilotDecisionView } from '../../services/api/views';
import { useDecisions } from '../../state/hooks/useAutopilot';
import { useNetwork } from '../../state/hooks/useNetwork';
import { usePermission } from '../../state/hooks/usePermission';
import { useSession } from '../../state/hooks/useSession';
import { Card } from '../../ui/cards/Card';
import { DataTable } from '../../ui/data/DataTable';
import { Badge } from '../../ui/primitives/Badge';
import type { BadgeTone } from '../../ui/primitives/Badge';
import { tabPanelProps, TextTabs } from '../../ui/primitives/TextTabs';
import { cn } from '../../ui/styles/cn';
import { PERMISSION_ASSISTANT } from '../aqueduct/permissions';
import { decisionDetailText, decisionStatusText } from './decisionText';
import styles from './Autopilot.module.css';

const PERCENT = 100;
const WHOLE = 0;
const ID_PREFIX = 'pilot-history';

type StateTab = 'all' | 'pending' | 'done' | 'other';

const TAB_STATUSES: Readonly<Record<StateTab, readonly DecisionStatus[] | null>> = {
  all: null,
  pending: ['PENDING'],
  done: ['ACCEPTED', 'EXECUTED'],
  other: ['REJECTED', 'EXPIRED', 'SKIPPED'],
};

const STATUS_TONE: Readonly<Record<DecisionStatus, BadgeTone>> = {
  PENDING: 'warning',
  ACCEPTED: 'ok',
  EXECUTED: 'ok',
  REJECTED: 'neutral',
  EXPIRED: 'neutral',
  SKIPPED: 'info',
};

interface DecisionHistoryProps {
  /** Shows only the newest decisions, without the reason column or the state tabs (dashboard). */
  readonly compact?: boolean;
  readonly maxRows?: number;
  readonly headingId: string;
  readonly headingLevel?: 'h2' | 'h3';
}

/**
 * The record of what the autopilot decided: when, where it came from (language model or rules),
 * what, which valve, why, how it ended and who settled it. Read-only; needs ASSISTANT_USE. The
 * full page filters by state with text tabs.
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
  const [tab, setTab] = useState<StateTab>('all');
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
  const wanted = compact ? null : TAB_STATUSES[tab];
  const rows = (decisions.data ?? [])
    .filter((decision) => wanted === null || wanted.includes(decision.status))
    .slice(0, maxRows);
  const nameOf = (decision: AutopilotDecisionView): string =>
    decision.valveId === null
      ? t('history.noValve')
      : (valveNames.get(decision.valveId) ?? t('history.noValve'));

  let body: JSX.Element;
  if (decisions.isError) {
    body = <p role="alert">{t('history.error')}</p>;
  } else {
    body = (
      <DataTable
        caption={t('history.title')}
        rows={rows}
        loading={decisions.isPending}
        getRowKey={(decision) => decision.id}
        empty={{ title: t('history.empty') }}
        columns={[
          {
            id: 'when',
            header: t('history.columns.when'),
            cell: (d) => <span className={cn(styles.nowrap)}>{d.createdAt.text}</span>,
          },
          {
            id: 'source',
            header: t('history.columns.source'),
            cell: (d) => (
              <>
                {t(`assistant.source.${lower(d.source)}`)}
                <span className={cn(styles.meta)}>
                  {t('history.confidence', {
                    percent: formatDecimal(d.confidence * PERCENT, WHOLE),
                  })}
                </span>
              </>
            ),
          },
          {
            id: 'action',
            header: t('history.columns.action'),
            cell: (d) => t(`assistant.action.${lower(d.action)}`),
          },
          {
            id: 'valve',
            header: t('history.columns.valve'),
            cell: (d) => <span className={cn(styles.nowrap)}>{nameOf(d)}</span>,
          },
          ...(compact
            ? []
            : [
                {
                  id: 'reason',
                  header: t('history.columns.reason'),
                  hideOnNarrow: true,
                  cell: (d: AutopilotDecisionView) => (
                    <span className={cn(styles.wrap)}>{d.reason}</span>
                  ),
                },
              ]),
          {
            id: 'status',
            header: t('history.columns.status'),
            cell: (d) => {
              const detail = decisionDetailText(d.statusDetail);
              return (
                <>
                  <Badge tone={STATUS_TONE[d.status]}>{decisionStatusText(d.status)}</Badge>
                  {detail === null ? null : <span className={cn(styles.meta)}>{detail}</span>}
                </>
              );
            },
          },
          {
            id: 'by',
            header: t('history.columns.decidedBy'),
            hideOnNarrow: true,
            cell: (d) => deciderText(d, currentUserId),
          },
        ]}
      />
    );
  }

  const content = (
    <>
      <div className={cn(styles.sectionHead)}>
        <Heading id={headingId} className={cn(styles.sectionTitle)}>
          {compact ? t('history.recentTitle') : t('history.title')}
        </Heading>
        {compact ? null : (
          <TextTabs
            label={t('history.tabsLabel')}
            idPrefix={ID_PREFIX}
            value={tab}
            onChange={(next) => {
              setTab(next as StateTab);
            }}
            tabs={[
              { id: 'all', label: t('history.tabs.all') },
              { id: 'pending', label: t('history.tabs.pending') },
              { id: 'done', label: t('history.tabs.done') },
              { id: 'other', label: t('history.tabs.other') },
            ]}
          />
        )}
      </div>
      <div {...(compact ? {} : tabPanelProps(ID_PREFIX, tab))}>{body}</div>
    </>
  );
  return compact ? (
    <section className={cn(styles.section)} aria-labelledby={headingId}>
      {content}
    </section>
  ) : (
    <Card as="section" aria-labelledby={headingId} className={cn(styles.section)}>
      {content}
    </Card>
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
