import { http, HttpResponse } from 'msw';

import type { components } from '../../services/api/schema';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';

type ManagedUserDto = components['schemas']['ManagedUser'];
type MembershipDto = components['schemas']['ManagedMembership'];
type SummaryDto = components['schemas']['Summary'];
type ShareDto = components['schemas']['SummaryShare'];
type AuditEntryDto = components['schemas']['AuditLogEntry'];
type PrivacyNoticeDto = components['schemas']['PrivacyNotice'];

const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;
const HASH_LENGTH = 64;
const HASH_HEX = 'a'.repeat(HASH_LENGTH);
const CREATED_STATUS = 201;
const NO_CONTENT_STATUS = 204;
const DEFAULT_PAGE_SIZE = 2;
const DEFAULT_ACTIVATION_CODE = 'ABCD-EFGH-JKMN';
const DEFAULT_RESET_CODE = 'WXYZ-2345-KLMN';
const CODE_TTL_MS = 86_400_000;
const IN_A_DAY = new Date(Date.now() + CODE_TTL_MS).toISOString();

export interface AdminBackendOptions {
  readonly aqueductId: string;
  readonly users?: readonly ManagedUserDto[];
  readonly memberships?: readonly MembershipDto[];
  readonly summaries?: readonly SummaryDto[];
  readonly auditEntries?: readonly AuditEntryDto[];
  readonly notice?: PrivacyNoticeDto;
  readonly pageSize?: number;
}

/** Page of a list by offset-encoded cursors (the real cursor is opaque; the fake is readable). */
function pageOf<T>(items: readonly T[], cursor: string | null, size: number) {
  const start = cursor === null ? 0 : Number(cursor);
  const next = start + size < items.length ? String(start + size) : null;
  return { items: items.slice(start, start + size), next_cursor: next };
}

/**
 * A small stateful fake of the admin areas: accounts, memberships, summary shares, the audit log
 * and the privacy notice. Tests read `users`, `memberships`, `summaries` and `queries` to check what
 * the screens sent. The rules that matter to the screens are the server's: one role at a time
 * (MEMBERSHIP_OVERLAP) and an account that exists once (CONFLICT).
 */
export function createAdminBackend(options: AdminBackendOptions) {
  const size = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const users: ManagedUserDto[] = [...(options.users ?? [])];
  const memberships: MembershipDto[] = [...(options.memberships ?? [])];
  const summaries: SummaryDto[] = [...(options.summaries ?? [])];
  const auditEntries: AuditEntryDto[] = [...(options.auditEntries ?? [])];
  const queries: { readonly path: string; readonly params: Readonly<Record<string, string>> }[] =
    [];
  const notice: PrivacyNoticeDto = options.notice ?? {
    version: 1,
    text_es: 'Primer párrafo del aviso.\n\nSegundo párrafo del aviso.',
    text_sha256: HASH_HEX,
    effective_at: '2026-01-01T00:00:00-05:00',
  };
  const acceptances: number[] = [];

  const remember = (path: string, url: URL) => {
    queries.push({ path, params: Object.fromEntries(url.searchParams) });
  };

  const handlers = [
    http.get(apiUrl('/users'), ({ request }) => {
      const url = new URL(request.url);
      remember('/users', url);
      return HttpResponse.json(pageOf(users, url.searchParams.get('cursor'), size));
    }),
    http.post(apiUrl('/users'), async ({ request }) => {
      const body = (await request.json()) as {
        username: string;
        full_name: string;
        aqueduct_id: string;
        role: MembershipDto['role_code'];
      };
      if (users.some((user) => user.username === body.username)) {
        return errorResponse(CONFLICT_STATUS, 'CONFLICT');
      }
      const id = `user-${users.length + 1}`;
      users.push({
        id,
        username: body.username,
        full_name: body.full_name,
        status: 'ACTIVE',
        locked_until: null,
        must_change_password: true,
        last_login_at: null,
      });
      const membershipId = `membership-${memberships.length + 1}`;
      memberships.push(membershipOf(membershipId, id, options.aqueductId, body.role));
      return HttpResponse.json(
        {
          id,
          username: body.username,
          full_name: body.full_name,
          status: 'ACTIVE',
          must_change_password: true,
          membership: { id: membershipId, aqueduct_id: options.aqueductId, role: body.role },
          activation_code: DEFAULT_ACTIVATION_CODE,
          expires_at: IN_A_DAY,
        },
        { status: CREATED_STATUS },
      );
    }),
    http.patch(apiUrl('/users/:id'), async ({ params, request }) => {
      const body = (await request.json()) as {
        status?: ManagedUserDto['status'];
        full_name?: string;
      };
      const index = users.findIndex((user) => user.id === params.id);
      const current = users[index];
      if (current === undefined) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      const updated: ManagedUserDto = {
        ...current,
        ...(body.status === undefined ? {} : { status: body.status }),
        ...(body.full_name === undefined ? {} : { full_name: body.full_name }),
      };
      users[index] = updated;
      return HttpResponse.json(updated);
    }),
    http.post(apiUrl('/users/:id/reset-grants'), () =>
      HttpResponse.json(
        { id: 'grant-1', code: DEFAULT_RESET_CODE, expires_at: IN_A_DAY },
        { status: CREATED_STATUS },
      ),
    ),
    http.get(apiUrl('/memberships'), ({ request }) => {
      const url = new URL(request.url);
      remember('/memberships', url);
      return HttpResponse.json(pageOf(memberships, url.searchParams.get('cursor'), size));
    }),
    http.post(apiUrl('/memberships'), async ({ request }) => {
      const body = (await request.json()) as {
        user_id: string;
        aqueduct_id: string;
        role_code: MembershipDto['role_code'];
      };
      const open = memberships.some(
        (membership) => membership.user_id === body.user_id && membership.valid_to === null,
      );
      if (open) {
        return errorResponse(CONFLICT_STATUS, 'CONFLICT', {
          details: { reason: 'MEMBERSHIP_OVERLAP' },
        });
      }
      const created = membershipOf(
        `membership-${memberships.length + 1}`,
        body.user_id,
        body.aqueduct_id,
        body.role_code,
      );
      memberships.push(created);
      return HttpResponse.json(created, { status: CREATED_STATUS });
    }),
    http.delete(apiUrl('/memberships/:id'), ({ params }) => {
      const index = memberships.findIndex((membership) => membership.id === params.id);
      const current = memberships[index];
      if (current !== undefined) {
        memberships[index] = { ...current, valid_to: new Date().toISOString() };
      }
      return new HttpResponse(null, { status: NO_CONTENT_STATUS });
    }),
    http.get(apiUrl('/summaries'), ({ request }) => {
      const url = new URL(request.url);
      remember('/summaries', url);
      return HttpResponse.json(pageOf(summaries, url.searchParams.get('cursor'), size));
    }),
    http.post(apiUrl('/summary-shares'), async ({ request }) => {
      const body = (await request.json()) as {
        grantee_user_id: string;
        scope: SummaryDto['scope'];
        period_from: string;
        period_to: string;
        reason: string;
        expires_at: string;
      };
      const id = `share-${summaries.length + 1}`;
      summaries.push({
        summary_share_id: id,
        scope: body.scope,
        period_from: body.period_from,
        period_to: body.period_to,
        content: { observed: 0, estimated: 0, inferred: 0, confirmed: 0 },
      });
      const share: ShareDto = {
        id,
        grantee_user_id: body.grantee_user_id,
        scope: body.scope,
        period_from: body.period_from,
        period_to: body.period_to,
        reason: body.reason,
        authorized_by: 'user-admin',
        authorized_at: new Date().toISOString(),
        expires_at: body.expires_at,
      };
      return HttpResponse.json(share, { status: CREATED_STATUS });
    }),
    http.delete(apiUrl('/summary-shares/:id'), ({ params }) => {
      const index = summaries.findIndex((summary) => summary.summary_share_id === params.id);
      if (index >= 0) {
        summaries.splice(index, 1);
      }
      return new HttpResponse(null, { status: NO_CONTENT_STATUS });
    }),
    http.get(apiUrl('/audit-log'), ({ request }) => {
      const url = new URL(request.url);
      remember('/audit-log', url);
      const action = url.searchParams.get('action');
      const matching = auditEntries.filter((entry) => action === null || entry.action === action);
      return HttpResponse.json(pageOf(matching, url.searchParams.get('cursor'), size));
    }),
    http.get(apiUrl('/privacy-notice/current'), () => HttpResponse.json(notice)),
    http.post(apiUrl('/privacy-notice/accept'), async ({ request }) => {
      const body = (await request.json()) as { version: number };
      if (body.version !== notice.version) {
        return errorResponse(CONFLICT_STATUS, 'CONFLICT', {
          details: { current_version: notice.version },
        });
      }
      acceptances.push(body.version);
      return HttpResponse.json(
        { user_id: 'user-test', version: body.version, accepted_at: new Date().toISOString() },
        { status: CREATED_STATUS },
      );
    }),
  ];

  return { handlers, users, memberships, summaries, queries, acceptances };
}

function membershipOf(
  id: string,
  userId: string,
  aqueductId: string,
  roleCode: MembershipDto['role_code'],
): MembershipDto {
  return {
    id,
    user_id: userId,
    aqueduct_id: aqueductId,
    role_code: roleCode,
    valid_from: '2026-01-01T00:00:00-05:00',
    valid_to: null,
    granted_by: 'user-admin',
  };
}
