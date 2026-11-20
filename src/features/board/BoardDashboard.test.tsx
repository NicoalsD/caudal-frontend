import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { createLiveBackend } from '../../test/msw/liveBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const COLD_CHUNK_WAIT_MS = 8000;

const ADMIN = buildSessionUser({
  role: 'BOARD_ADMIN',
  permissions: [
    'NETWORK_VIEW',
    'STATUS_VIEW',
    'RULESET_VIEW',
    'ASSISTANT_USE',
    'AUTOPILOT_CONFIGURE',
    'REPORT_VIEW',
    'VALVE_COMMAND_MANUAL',
  ],
});
const LOOKER = buildSessionUser({
  role: 'BOARD_MEMBER',
  permissions: ['NETWORK_VIEW', 'STATUS_VIEW', 'RULESET_VIEW', 'ASSISTANT_USE'],
});
const BARE = buildSessionUser({
  role: 'BOARD_MEMBER',
  permissions: ['STATUS_VIEW', 'RULESET_VIEW'],
});

describe('Board dashboard (overview)', () => {
  it('leads with the recommendation of the moment, then the chart and the regions', async () => {
    server.use(...createLiveBackend().handlers);
    renderApp(ROUTE_PATHS.board.tank, { user: ADMIN });

    // The first screen of the file loads its lazy chunk cold, which takes longer than the default wait.
    const now = await screen.findByRole(
      'region',
      { name: t('console.bandLabel') },
      { timeout: COLD_CHUNK_WAIT_MS },
    );
    expect(
      await within(now).findByRole('heading', {
        name: t('assistant.recommendation', {
          action: t('assistant.action.open'),
          valve: 'Válvula alta',
        }),
      }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: t('board.panorama.chartTitle') })).toBeVisible();
    const regions = await screen.findByRole('list', { name: t('console.regionsLabel') });
    expect(within(regions).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('lets the admin move each valve from its region, as on the plumber home', async () => {
    server.use(...createLiveBackend().handlers);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.tank, { user: ADMIN });

    const regions = await screen.findByRole('list', { name: t('console.regionsLabel') });
    await user.click(
      await within(regions).findByRole('button', {
        name: t('valves.openNamed', { valve: 'Válvula alta' }),
      }),
    );
    expect(
      await screen.findByRole('dialog', {
        name: t('valveControl.title', { valve: 'Válvula alta' }),
      }),
    ).toBeVisible();
  });

  it('only tells the state of the regions to a person who cannot move valves', async () => {
    server.use(...createLiveBackend().handlers);
    renderApp(ROUTE_PATHS.board.tank, { user: LOOKER });

    const regions = await screen.findByRole('list', { name: t('console.regionsLabel') });
    expect(within(regions).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the assistant in its side panel', async () => {
    server.use(...createLiveBackend().handlers);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.tank, { user: ADMIN });

    await user.click(await screen.findByRole('button', { name: t('chat.open') }));
    const panel = await screen.findByRole('dialog', { name: t('chat.title') });
    expect(within(panel).getByRole('button', { name: t('chat.suggestion.enough') })).toBeVisible();
  });

  it('keeps the history, the proposals and the network one link away', async () => {
    server.use(...createLiveBackend().handlers);
    renderApp(ROUTE_PATHS.board.tank, { user: ADMIN });

    const more = await screen.findByRole('navigation', { name: t('board.calm.moreLabel') });
    expect(within(more).getByRole('link', { name: t('board.calm.pilotHistory') })).toHaveAttribute(
      'href',
      ROUTE_PATHS.board.autopilot,
    );
    expect(within(more).getByRole('link', { name: t('board.calm.network') })).toHaveAttribute(
      'href',
      ROUTE_PATHS.board.network,
    );
  });

  it('leaves out what the person cannot read', async () => {
    renderApp(ROUTE_PATHS.board.tank, { user: BARE });

    expect(
      await screen.findByRole('heading', { name: t('board.panorama.chartTitle') }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: t('chat.open') })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: t('console.regionsLabel') })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t('board.calm.network') })).not.toBeInTheDocument();
  });
});
