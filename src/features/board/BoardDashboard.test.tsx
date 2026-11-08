import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { createLiveBackend } from '../../test/msw/liveBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

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
const BARE = buildSessionUser({
  role: 'BOARD_MEMBER',
  permissions: ['STATUS_VIEW', 'RULESET_VIEW'],
});

describe('Board dashboard (overview)', () => {
  it('shows the four figures: level with band, reserve days, coverage by region and incidents', async () => {
    server.use(...createLiveBackend().handlers);
    renderApp(ROUTE_PATHS.board.tank, {
      user: buildSessionUser({ ...ADMIN, permissions: [...ADMIN.permissions, 'INCIDENT_READ'] }),
    });

    const group = await screen.findByRole('group', { name: t('board.kpis.label') });
    expect(await within(group).findByText(t('board.kpis.level'))).toBeVisible();
    expect(within(group).getByText(t('board.kpis.reserve'))).toBeVisible();
    expect(await within(group).findByText(/Sector Escuela: 75 %/)).toBeVisible();
    expect(await within(group).findByText(t('board.kpis.incidents'))).toBeVisible();
    expect(await within(group).findByText(t('board.kpis.coverage'))).toBeVisible();
  });

  it('shows the pilot record, the assistant and the report card, and asks for the narrative on demand', async () => {
    server.use(...createLiveBackend().handlers);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.tank, { user: ADMIN });

    await user.click(await screen.findByRole('tab', { name: t('board.history.pilot') }));
    const pilot = await screen.findByRole('region', { name: t('history.recentTitle') });
    expect(await within(pilot).findByRole('table')).toBeVisible();
    expect(await screen.findByRole('heading', { name: t('board.stack.title') })).toBeVisible();
    expect(await screen.findByRole('heading', { name: t('assistant.askTitle') })).toBeVisible();

    const card = screen.getByRole('region', { name: t('board.report.title') });
    expect(within(card).queryByRole('status')).not.toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: t('board.report.generate') }));
    expect(await within(card).findByText('El tanque se mantuvo estable.')).toBeVisible();
  });

  it('draws the scene for looking only: no valve dialog can open', async () => {
    server.use(...createLiveBackend().handlers);
    renderApp(ROUTE_PATHS.board.tank, { user: ADMIN });

    const scene = await screen.findByRole('region', { name: t('board.scene.title') });
    expect(await within(scene).findByTestId('aqueduct-scene')).toHaveAttribute(
      'data-readonly',
      'true',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves out what the person cannot read', async () => {
    renderApp(ROUTE_PATHS.board.tank, { user: BARE });

    expect(await screen.findByText(t('board.kpis.level'))).toBeVisible();
    expect(screen.queryByText(t('board.kpis.coverage'))).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: t('board.history.pilot') })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: t('board.stack.title') })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: t('board.report.title') })).not.toBeInTheDocument();
  });
});
