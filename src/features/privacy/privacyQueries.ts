import { useMutation, useQuery } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '../../state/queryKeys';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { useSessionActions } from '../../state/hooks/sessionActionsContext';
import type { PrivacyNoticeView } from '../../services/api/views';

/** GET /privacy-notice/current. The text is read again when the person lands on the screen. */
export function usePrivacyNotice(): UseQueryResult<PrivacyNoticeView> {
  const api = useCaudalApi();
  return useQuery({
    queryKey: queryKeys.privacyNotice,
    queryFn: () => api.privacy.current(),
    refetchOnWindowFocus: false,
  });
}

/**
 * Accepts the version shown. The session opens only after the server answers (see
 * SessionController.acceptPrivacyNotice), so an offline attempt changes nothing.
 */
export function useAcceptPrivacyNotice(): UseMutationResult<void, Error, number> {
  const actions = useSessionActions();
  return useMutation({
    mutationFn: (version) => actions.acceptPrivacyNotice(version),
  });
}
