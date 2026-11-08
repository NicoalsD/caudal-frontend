import { useState } from 'react';
import type { JSX } from 'react';
import { Bot, CalendarClock, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

import { formatDecimal } from '../../core/format/decimal';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import { useOpenAnomalies } from '../../state/hooks/useAnomalies';
import { useDecisions } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { Card } from '../../ui/cards/Card';
import { DataTable } from '../../ui/data/DataTable';
import { Badge } from '../../ui/primitives/Badge';
import { Chip } from '../../ui/primitives/Chip';
import type { ChipTone } from '../../ui/primitives/Chip';
import { tabPanelProps, TextTabs } from '../../ui/primitives/TextTabs';
import { cn } from '../../ui/styles/cn';
import { PERMISSION_ASSISTANT } from '../aqueduct/permissions';
import { DecisionHistory } from '../autopilot';
import { proposalDetailPath } from '../proposals/paths';
import { ProposalStatusChip } from '../proposals/ProposalStatusChip';
import { useProposalsOfDay } from '../proposals/proposalQueries';
import { AnomalyList } from '../tank-status';
import { anomalyKindText } from '../tank-status/anomalyKindText';
import { decisionStatusText } from '../autopilot/decisionText';
import styles from './BoardPanel.module.css';

const TITLE_ID = 'board-history-title';
const ID_PREFIX = 'board-history';
const RECENT_DECISIONS = 5;
const PILOT_ROWS = 8;
const PERCENT = 100;
const WHOLE = 0;

type TabId = 'all' | 'anomalies' | 'proposals' | 'pilot';

interface Row {
  readonly id: string;
  readonly kind: 'anomaly' | 'proposal' | 'pilot';
  readonly detail: JSX.Element | string;
  readonly when: string;
  readonly state: JSX.Element;
}

const KIND_LOOK: Readonly<Record<Row['kind'], { icon: LucideIcon; tone: ChipTone; text: string }>> =
  {
    anomaly: { icon: TriangleAlert, tone: 'coral', text: 'board.history.kindAnomaly' },
    proposal: { icon: CalendarClock, tone: 'aqua', text: 'board.history.kindProposal' },
    pilot: { icon: Bot, tone: 'lavender', text: 'board.history.kindPilot' },
  };

/**
 * "Pendientes e historial": what waits for the Board (anomalies, today's proposal) and what the
 * pilot did, in one table with text tabs. Each tab shows only its own panel.
 */
export function HistoryPanel(): JSX.Element {
  const [tab, setTab] = useState<TabId>('all');
  const canSeePilot = usePermission(PERMISSION_ASSISTANT);
  const today = useServiceToday();
  const anomalies = useOpenAnomalies();
  const proposals = useProposalsOfDay(today);
  const decisions = useDecisions(undefined, canSeePilot);

  const anomalyRows: readonly Row[] = (anomalies.data?.items ?? []).map((anomaly) => ({
    id: `anomaly-${anomaly.id}`,
    kind: 'anomaly',
    detail: anomalyKindText(anomaly.kind),
    when: anomaly.detectedAt.text,
    state: <Badge tone="warning">{t('board.history.stateOpen')}</Badge>,
  }));
  const proposalRows: readonly Row[] = (proposals.data ?? []).map((proposal) => ({
    id: `proposal-${proposal.id}`,
    kind: 'proposal',
    detail: <Link to={proposalDetailPath(proposal.id)}>{t('board.history.proposalDetail')}</Link>,
    when: proposal.generatedAt.text,
    state: <ProposalStatusChip status={proposal.status} />,
  }));
  const pilotRows: readonly Row[] = (decisions.data ?? [])
    .slice(0, RECENT_DECISIONS)
    .map((decision) => ({
      id: `pilot-${decision.id}`,
      kind: 'pilot',
      detail: `${t(`assistant.action.${lower(decision.action)}`)}. ${t('assistant.confidence', {
        percent: formatDecimal(decision.confidence * PERCENT, WHOLE),
      })}`,
      when: decision.createdAt.text,
      state: <Badge tone="info">{decisionStatusText(decision.status)}</Badge>,
    }));
  const loading = anomalies.isPending || proposals.isPending;
  const tabs = [
    { id: 'all', label: t('board.history.all') },
    { id: 'anomalies', label: t('board.history.anomalies') },
    { id: 'proposals', label: t('board.history.proposals') },
    ...(canSeePilot ? [{ id: 'pilot', label: t('board.history.pilot') }] : []),
  ];
  const rowsOf = (rows: readonly Row[]): JSX.Element => (
    <DataTable
      caption={t('board.history.title')}
      rows={rows}
      loading={loading}
      getRowKey={(row) => row.id}
      empty={{
        title: t('board.history.emptyTitle'),
        description: t('board.history.emptyDescription'),
      }}
      columns={[
        {
          id: 'type',
          header: t('board.history.type'),
          cell: (row) => {
            const look = KIND_LOOK[row.kind];
            const Icon = look.icon;
            return (
              <Chip tone={look.tone} icon={<Icon aria-hidden="true" />}>
                {t(look.text as 'board.history.kindAnomaly')}
              </Chip>
            );
          },
        },
        { id: 'detail', header: t('board.history.detail'), cell: (row) => row.detail },
        {
          id: 'when',
          header: t('board.history.when'),
          hideOnNarrow: true,
          cell: (row) => row.when,
        },
        { id: 'state', header: t('board.history.state'), align: 'end', cell: (row) => row.state },
      ]}
    />
  );

  let panel: JSX.Element;
  if (tab === 'anomalies') {
    panel =
      (anomalies.data?.items.length ?? 0) === 0 ? (
        <p className={cn(styles.quiet)}>{t('anomalies.none')}</p>
      ) : (
        <AnomalyList hideWhenEmpty />
      );
  } else if (tab === 'proposals') {
    panel = rowsOf(proposalRows);
  } else if (tab === 'pilot' && canSeePilot) {
    panel = (
      <DecisionHistory compact maxRows={PILOT_ROWS} headingId="board-pilot-log" headingLevel="h3" />
    );
  } else {
    panel = (
      <>
        {rowsOf([...anomalyRows, ...proposalRows, ...pilotRows])}
        <AnomalyList hideWhenEmpty />
      </>
    );
  }
  return (
    <Card as="section" aria-labelledby={TITLE_ID} className={cn(styles.history)}>
      <header className={cn(styles.sectionHead)}>
        <h2 id={TITLE_ID} className={cn(styles.sectionTitle)}>
          {t('board.history.title')}
        </h2>
        <TextTabs
          label={t('board.history.tabs')}
          idPrefix={ID_PREFIX}
          tabs={tabs}
          value={tab}
          onChange={(next) => {
            setTab(next as TabId);
          }}
        />
      </header>
      <div {...tabPanelProps(ID_PREFIX, tab)}>{panel}</div>
    </Card>
  );
}
