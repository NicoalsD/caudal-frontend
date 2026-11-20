import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { PERMISSIONS_BY_ROLE } from '../../test/factories/auth';
import { buildSessionUser } from '../../test/factories/session';
import { createLiveBackend } from '../../test/msw/liveBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const COLD_CHUNK_WAIT_MS = 8000;

const INSTITUTION_ADMIN = buildSessionUser({
  role: 'INSTITUTION_ADMIN',
  permissions: [...PERMISSIONS_BY_ROLE.INSTITUTION_ADMIN],
});
const VIEWER = buildSessionUser({
  role: 'VIEWER',
  permissions: [...PERMISSIONS_BY_ROLE.VIEWER],
});

describe('institution roles on the Board screens', () => {
  it('sends the institution administrator to the tank panel with the admin menu', async () => {
    server.use(...createLiveBackend().handlers);
    const { router } = renderApp(ROUTE_PATHS.root, { user: INSTITUTION_ADMIN });

    expect(router.state.location.pathname).toBe(ROUTE_PATHS.board.tank);
    expect(await screen.findByRole('link', { name: t('nav.users') })).toBeInTheDocument();
  });

  it('lets the institution administrator move the valves, like the Board administrator', async () => {
    server.use(...createLiveBackend().handlers);
    renderApp(ROUTE_PATHS.board.tank, { user: INSTITUTION_ADMIN });

    // Cold lazy chunk on the first screen of the file: same wait as the Board dashboard test.
    const regions = await screen.findByRole(
      'list',
      { name: t('console.regionsLabel') },
      { timeout: COLD_CHUNK_WAIT_MS },
    );
    expect(within(regions).getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('opens the tank panel to the viewer, read-only: no valve controls', async () => {
    server.use(...createLiveBackend().handlers);
    const { router } = renderApp(ROUTE_PATHS.root, { user: VIEWER });

    expect(router.state.location.pathname).toBe(ROUTE_PATHS.board.tank);
    const regions = await screen.findByRole('list', { name: t('console.regionsLabel') });
    expect(within(regions).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the viewer out of the admin screens (403, not the screen)', async () => {
    const { router } = renderApp(ROUTE_PATHS.board.users, { user: VIEWER });

    expect(router.state.location.pathname).toBe(ROUTE_PATHS.board.users);
    expect(
      await screen.findByRole('heading', { level: 1, name: t('errors.forbiddenTitle') }),
    ).toBeInTheDocument();
  });
});
