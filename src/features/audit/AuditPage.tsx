import { useState } from 'react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import type { AuditLogEntryView, SecurityEventView } from '../../services/api/views';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './AuditPage.module.css';
import { useAuditLog, useSecurityEvents } from './auditQueries';
import {
  KNOWN_ACTION_CODES,
  actionLabel,
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
    <>
      <ScreenTitle>{t('screens.audit')}</ScreenTitle>
      <div className={cn(styles.tabs)} role="group" aria-label={t('screens.audit')}>
        <Button
          aria-pressed={tab === 'audit'}
          variant={tab === 'audit' ? 'primary' : 'secondary'}
          onClick={() => {
            setTab('audit');
          }}
        >
          {t('audit.tabAudit')}
        </Button>
        <Button
          aria-pressed={tab === 'security'}
          variant={tab === 'security' ? 'primary' : 'secondary'}
          onClick={() => {
            setTab('security');
          }}
        >
          {t('audit.tabSecurity')}
        </Button>
      </div>
      <FiltersForm tab={tab} filters={filters} onChange={setFilters} />
      {tab === 'audit' ? (
        <AuditLogList filters={filters} />
      ) : (
        <SecurityEventsList filters={filters} />
      )}
    </>
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
  return (
    <>
      {items.length === 0 ? (
        <p>{t('audit.empty')}</p>
      ) : (
        <ul className={cn(styles.list)}>
          {items.map((entry) => (
            <AuditItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
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

function AuditItem({ entry }: { readonly entry: AuditLogEntryView }): JSX.Element {
  return (
    <li className={cn(styles.item)}>
      <h3 className={cn(styles.title)}>{actionLabel(entry.action)}</h3>
      <p className={cn(styles.meta)}>{entry.occurredAt.text}</p>
      <p className={cn(styles.meta)}>
        {t('audit.actor', { actor: actorTypeLabel(entry.actorType) })}
      </p>
      <p className={cn(styles.meta)}>{t('audit.object', { object: entry.entityType })}</p>
    </li>
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
  return (
    <>
      {items.length === 0 ? (
        <p>{t('audit.empty')}</p>
      ) : (
        <ul className={cn(styles.list)}>
          {items.map((event) => (
            <SecurityItem key={event.id} event={event} />
          ))}
        </ul>
      )}
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

function SecurityItem({ event }: { readonly event: SecurityEventView }): JSX.Element {
  return (
    <li className={cn(styles.item)}>
      <h3 className={cn(styles.title)}>{securityTypeLabel(event.type)}</h3>
      <p className={cn(styles.meta)}>{event.createdAt.text}</p>
      <p className={cn(styles.meta)}>
        {t('audit.severity', { severity: severityLabel(event.severity) })}
      </p>
    </li>
  );
}
