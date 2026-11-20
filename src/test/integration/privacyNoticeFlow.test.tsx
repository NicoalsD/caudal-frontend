import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { PERMISSIONS_BY_ROLE, TEST_AQUEDUCT_ID } from '../factories/auth';
import { buildSessionUser } from '../factories/session';
import { apiUrl } from '../msw/apiUrl';
import { createAdminBackend } from '../msw/adminBackend';
import { errorResponse } from '../msw/errorResponse';
import { server } from '../msw/server';
import { renderApp } from '../renderApp';

const NOTICE_PARAGRAPH = 'Primer párrafo del aviso.';
const FORBIDDEN_STATUS = 403;

const boardAdmin = () =>
  buildSessionUser({
    role: 'BOARD_ADMIN',
    aqueductId: TEST_AQUEDUCT_ID,
    permissions: [...PERMISSIONS_BY_ROLE.BOARD_ADMIN],
  });

const operator = (privacyNoticePending: boolean) =>
  buildSessionUser({
    role: 'OPERATOR',
    aqueductId: TEST_AQUEDUCT_ID,
    permissions: [...PERMISSIONS_BY_ROLE.OPERATOR],
    privacyNoticePending,
  });

describe('privacy notice gate (F092)', () => {
  it('keeps the app closed until the notice is accepted, then opens it', async () => {
    const backend = createAdminBackend({ aqueductId: TEST_AQUEDUCT_ID });
    server.use(...backend.handlers);
    const user = userEvent.setup();
    const { router } = renderApp(ROUTE_PATHS.operator.pending, { user: operator(true) });

    expect(await screen.findByText(NOTICE_PARAGRAPH)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(ROUTE_PATHS.privacyNotice);
    const accept = screen.getByRole('button', { name: t('privacy.submit') });
    expect(accept).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: t('privacy.acceptLabel') }));
    await user.click(accept);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.home);
    });
    expect(backend.acceptances).toEqual([1]);
  });

  it('sends the person to the notice when a call answers PRIVACY_NOTICE_PENDING', async () => {
    server.use(...createAdminBackend({ aqueductId: TEST_AQUEDUCT_ID }).handlers);
    server.use(
      http.get(apiUrl('/users'), () => errorResponse(FORBIDDEN_STATUS, 'PRIVACY_NOTICE_PENDING')),
    );
    const { router } = renderApp(ROUTE_PATHS.board.users, { user: boardAdmin() });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.privacyNotice);
    });
    expect(await screen.findByText(NOTICE_PARAGRAPH)).toBeInTheDocument();
  });
});
