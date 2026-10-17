import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { AuditLogPageView, SecurityEventPageView } from '../views';

type AuditLogPageDto = components['schemas']['AuditLogPage'];
type SecurityEventPageDto = components['schemas']['SecurityEventPage'];

/** Filters of GET /audit-log. Instants are ISO-8601 with offset; `action` is an upper-case code. */
export interface AuditLogFilter {
  readonly from?: string;
  readonly to?: string;
  readonly action?: string;
  readonly cursor?: string;
}

/** Filters of GET /security-events. */
export interface SecurityEventFilter {
  readonly type?: string;
  readonly from?: string;
  readonly to?: string;
  readonly cursor?: string;
}

/** The audit log and the security events, read only (API.md section 18). */
export class AuditApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /audit-log: one page, newest first. Pass the previous `nextCursor` to continue. */
  async listAuditLog(filter: AuditLogFilter): Promise<AuditLogPageView> {
    const response = await this.http.request<AuditLogPageDto>({
      method: 'GET',
      path: '/audit-log',
      query: definedQuery({
        from: filter.from,
        to: filter.to,
        action: filter.action,
        cursor: filter.cursor,
      }),
    });
    return this.adapter.toAuditLogPage(response.body);
  }

  /** GET /security-events: one page, newest first. */
  async listSecurityEvents(filter: SecurityEventFilter): Promise<SecurityEventPageView> {
    const response = await this.http.request<SecurityEventPageDto>({
      method: 'GET',
      path: '/security-events',
      query: definedQuery({
        type: filter.type,
        from: filter.from,
        to: filter.to,
        cursor: filter.cursor,
      }),
    });
    return this.adapter.toSecurityEventPage(response.body);
  }
}

/** Keeps only the parameters that have a value, so the query string stays short. */
function definedQuery(values: Record<string, string | undefined>): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') {
      query[name] = value;
    }
  }
  return query;
}
