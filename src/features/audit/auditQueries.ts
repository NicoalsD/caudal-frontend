import { useInfiniteQuery } from '@tanstack/react-query';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';

import type { AuditLogFilter, SecurityEventFilter } from '../../services/api/endpoints/AuditApi';
import type { AuditLogPageView, SecurityEventPageView } from '../../services/api/views';
import { useAqueductId } from '../../state/hooks/useAqueductId';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { aqueductKey } from '../../state/queryKeys';

const AUDIT_SCOPE = 'audit-log';
const SECURITY_SCOPE = 'security-events';

/**
 * GET /audit-log, page by page. The filters are part of the query key: a new filter starts again
 * from the first page, so a cursor never meets another filter (CURSOR_INVALID).
 */
export function useAuditLog(
  filter: Omit<AuditLogFilter, 'cursor'>,
): UseInfiniteQueryResult<{ readonly pages: readonly AuditLogPageView[] }> {
  const api = useCaudalApi();
  const key = aqueductKey(useAqueductId(), AUDIT_SCOPE, JSON.stringify(filter));
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) =>
      api.audit.listAuditLog({
        ...filter,
        ...(pageParam === undefined ? {} : { cursor: pageParam }),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}

/** GET /security-events, page by page, with the same rules as the audit log. */
export function useSecurityEvents(
  filter: Omit<SecurityEventFilter, 'cursor'>,
  enabled: boolean,
): UseInfiniteQueryResult<{ readonly pages: readonly SecurityEventPageView[] }> {
  const api = useCaudalApi();
  const key = aqueductKey(useAqueductId(), SECURITY_SCOPE, JSON.stringify(filter));
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) =>
      api.audit.listSecurityEvents({
        ...filter,
        ...(pageParam === undefined ? {} : { cursor: pageParam }),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    refetchOnWindowFocus: false,
  });
}
