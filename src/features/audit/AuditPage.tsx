import { Cpu, ShieldAlert, ShieldCheck, TriangleAlert, User, Workflow } from 'lucide-react';
import { useState } from 'react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import type { AuditLogEntryView, SecurityEventView } from '../../services/api/views';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { StatTile } from '../../ui/cards/StatTile';
import { DataTable } from '../../ui/data/DataTable';
import type { DataColumn } from '../../ui/data/DataTable';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Badge } from '../../ui/primitives/Badge';
import type { BadgeTone } from '../../ui/primitives/Badge';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { TextTabs, tabPanelProps } from '../../ui/primitives/TextTabs';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './AuditPage.module.css';
import { useAuditLog, useSecurityEvents } from './auditQueries';
import {
  KNOWN_ACTION_CODES,
  actionLabel,
  entityTypeLabel,
  actorTypeLabel,
  securityTypeLabel,
  severityLabel,
} from './auditText';
import { bogotaDayEnd, bogotaDayStart } from '../../core/format/bogotaDay';

const SECURITY_TYPE_CODES: readonly string[] = [
  'ACCOUNT_LOCKED',
  'TOKEN_REUSE_DETECTED',
  'PERMISSION_DENIED',
  'RATE_LIMITED',
  'INVALID_SIGNATURE',
  'NONCE_REPLAY',
  'HONEYPOT_TRIGGERED',
  'IMPORT_REJECTED',
  'MFA_FAILED',
];

type Tab = 'audit' | 'security';

/** Empty string means "no filter". Dates are calendar days in America/Bogota (YYYY-MM-DD). */
interface Filters {
  readonly from: string;
  readonly to: string;
  readonly action: string;
  readonly eventType: string;
}

const NO_FILTERS: Filters = { from: '', to: '', action: '', eventType: '' };

/** The filters the API receives: whole days in Bogota, as ISO instants with offset. */
function apiRange(filters: Filters): { from?: string; to?: string } {
  const from = filters.from === '' ? null : bogotaDayStart(filters.from);
  const to = filters.to === '' ? null : bogotaDayEnd(filters.to);
  return {
    ...(from === null ? {} : { from }),
    ...(to === null ? {} : { to }),
  };
}

/**
 * Screen S26: who did what and when, and the security events. Read only. Both tabs are for the
 * Board's administrator and the project team; the server checks AUDIT_VIEW on every call.
 */
export function AuditPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('audit');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  return (
    <div className={cn(styles.page)}>
      <ScreenTitle>{t('screens.audit')}</ScreenTitle>
      <PageHeader
        lead={t('audit.lead')}
        filters={
          <TextTabs
            label={t('screens.audit')}
            idPrefix="audit"
            value={tab}
            onChange={(id) => {
              setTab(id === 'security' ? 'security' : 'audit');
            }}
            tabs={[
              { id: 'audit', label: t('audit.tabAudit') },
              { id: 'security', label: t('audit.tabSecurity') },
            ]}
          />
        }
      />
      <FiltersForm tab={tab} filters={filters} onChange={setFilters} />
      <div {...tabPanelProps('audit', tab)} className={cn(styles.panel)}>
        {tab === 'audit' ? (
          <AuditLogList filters={filters} />
        ) : (
          <SecurityEventsList filters={filters} />
        )}
      </div>
    </div>
  );
}

interface FiltersFormProps {
  readonly tab: Tab;
  readonly filters: Filters;
  readonly onChange: (filters: Filters) => void;
}

function FiltersForm({ tab, filters, onChange }: FiltersFormProps): JSX.Element {
  return (
    <form
      className={cn(styles.filters)}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <TextField
        label={t('audit.from')}
        type="date"
        value={filters.from}
        onChange={(event) => {
          onChange({ ...filters, from: event.target.value });
        }}
      />
      <TextField
        label={t('audit.to')}
        type="date"
        value={filters.to}
        onChange={(event) => {
          onChange({ ...filters, to: event.target.value });
        }}
      />
      {tab === 'audit' ? (
        <label>
          <span>{t('audit.action')}</span>
          <select
            className={cn(styles.select)}
            value={filters.action}
            onChange={(event) => {
              onChange({ ...filters, action: event.target.value });
            }}
          >
            <option value="">{t('audit.allActions')}</option>
            {KNOWN_ACTION_CODES.map((code) => (
              <option key={code} value={code}>
                {actionLabel(code)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          <span>{t('audit.eventType')}</span>
          <select
            className={cn(styles.select)}
            value={filters.eventType}
            onChange={(event) => {
              onChange({ ...filters, eventType: event.target.value });
            }}
          >
            <option value="">{t('audit.allEvents')}</option>
            {SECURITY_TYPE_CODES.map((code) => (
              <option key={code} value={code}>
                {securityTypeLabel(code)}
              </option>
            ))}
          </select>
        </label>
      )}
    </form>
  );
}

function AuditLogList({ filters }: { readonly filters: Filters }): JSX.Element {
  const audit = useAuditLog({
    ...apiRange(filters),
    ...(filters.action === '' ? {} : { action: filters.action }),
  });
  if (audit.isPending) {
    return <LoadingState message={t('audit.loading')} />;
  }
  if (audit.isError) {
    return (
      <QueryError
        title={t('screens.audit')}
        error={audit.error}
        onRetry={() => {
          void audit.refetch();
        }}
      />
    );
  }
  const items = audit.data.pages.flatMap((page) => page.items);
  const byActor = (type: string): number =>
    items.filter((entry) => entry.actorType === type).length;
  const columns: readonly DataColumn<AuditLogEntryView>[] = [
    {
      id: 'action',
      header: t('audit.columns.action'),
      cell: (entry) => <strong>{actionLabel(entry.action)}</strong>,
    },
    {
      id: 'when',
      header: t('audit.columns.when'),
      cell: (entry) => entry.occurredAt.text,
    },
    {
      id: 'actor',
      header: t('audit.columns.actor'),
      cell: (entry) => <Chip tone="aqua">{actorTypeLabel(entry.actorType)}</Chip>,
    },
    {
      id: 'object',
      header: t('audit.columns.object'),
      hideOnNarrow: true,
      cell: (entry) => <span className={cn(styles.meta)}>{entityTypeLabel(entry.entityType)}</span>,
    },
  ];
  return (
    <>
      <ul className={cn(styles.tiles)} aria-label={t('audit.tilesLabel')}>
        <li>
          <StatTile
            icon={ShieldCheck}
            tint="aqua"
            label={t('audit.tiles.loaded')}
            value={items.length}
          />
        </li>
        <li>
          <StatTile
            icon={User}
            tint="mint"
            label={t('audit.tiles.users')}
            value={byActor('USER')}
          />
        </li>
        <li>
          <StatTile
            icon={Cpu}
            tint="sand"
            label={t('audit.tiles.devices')}
            value={byActor('DEVICE')}
          />
        </li>
        <li>
          <StatTile
            icon={Workflow}
            tint="lavender"
            label={t('audit.tiles.system')}
            value={byActor('SYSTEM')}
          />
        </li>
      </ul>
      <DataTable
        caption={t('audit.tabAudit')}
        columns={columns}
        rows={items}
        getRowKey={(entry) => String(entry.id)}
        empty={{ title: t('audit.empty') }}
      />
      {audit.hasNextPage ? (
        <Button
          disabled={audit.isFetchingNextPage}
          onClick={() => {
            void audit.fetchNextPage();
          }}
        >
          {t('audit.loadMore')}
        </Button>
      ) : null}
    </>
  );
}

function SecurityEventsList({ filters }: { readonly filters: Filters }): JSX.Element {
  const events = useSecurityEvents(
    {
      ...apiRange(filters),
      ...(filters.eventType === '' ? {} : { type: filters.eventType }),
    },
    true,
  );
  if (events.isPending) {
    return <LoadingState message={t('audit.loading')} />;
  }
  if (events.isError) {
    return (
      <QueryError
        title={t('screens.audit')}
        error={events.error}
        onRetry={() => {
          void events.refetch();
        }}
      />
    );
  }
  const items = events.data.pages.flatMap((page) => page.items);
  const bySeverity = (...levels: string[]): number =>
    items.filter((event) => levels.includes(event.severity.toLowerCase())).length;
  const columns: readonly DataColumn<SecurityEventView>[] = [
    {
      id: 'type',
      header: t('audit.columns.event'),
      cell: (event) => <strong>{securityTypeLabel(event.type)}</strong>,
    },
    { id: 'when', header: t('audit.columns.when'), cell: (event) => event.createdAt.text },
    {
      id: 'severity',
      header: t('audit.columns.severity'),
      cell: (event) => (
        <Badge tone={severityTone(event.severity)}>{severityLabel(event.severity)}</Badge>
      ),
    },
  ];
  return (
    <>
      <ul className={cn(styles.tiles)} aria-label={t('audit.tilesLabel')}>
        <li>
          <StatTile
            icon={ShieldAlert}
            tint="aqua"
            label={t('audit.tiles.loadedEvents')}
            value={items.length}
          />
        </li>
        <li>
          <StatTile
            icon={TriangleAlert}
            tint="coral"
            label={t('audit.tiles.severe')}
            value={bySeverity('high', 'critical')}
          />
        </li>
        <li>
          <StatTile
            icon={ShieldCheck}
            tint="mint"
            label={t('audit.tiles.minor')}
            value={bySeverity('low', 'medium')}
          />
        </li>
      </ul>
      <DataTable
        caption={t('audit.tabSecurity')}
        columns={columns}
        rows={items}
        getRowKey={(event) => String(event.id)}
        empty={{ title: t('audit.empty') }}
      />
      {events.hasNextPage ? (
        <Button
          disabled={events.isFetchingNextPage}
          onClick={() => {
            void events.fetchNextPage();
          }}
        >
          {t('audit.loadMore')}
        </Button>
      ) : null}
    </>
  );
}

function severityTone(severity: string): BadgeTone {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    default:
      return 'info';
  }
}
