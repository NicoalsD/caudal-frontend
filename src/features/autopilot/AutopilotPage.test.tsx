import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildDecision } from '../../test/factories/live';
import { buildSessionUser } from '../../test/factories/session';
import { createLiveBackend } from '../../test/msw/liveBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const ADMIN = buildSessionUser({
  role: 'BOARD_ADMIN',
  permissions: ['NETWORK_VIEW', 'ASSISTANT_USE', 'AUTOPILOT_CONFIGURE'],
});
const MEMBER = buildSessionUser({
  role: 'BOARD_MEMBER',
  permissions: ['NETWORK_VIEW', 'ASSISTANT_USE'],
});

function open(user = ADMIN) {
  const backend = createLiveBackend();
  server.use(...backend.handlers);
  renderApp(ROUTE_PATHS.board.autopilot, { user });
  return backend;
}

describe('Autopilot page (settings and history)', () => {
  it('saves the mode and the limits the administrator chose', async () => {
    const backend = open();
    const user = userEvent.setup();

    const absence = await screen.findByLabelText(t('settings.absenceLabel'));
    await user.clear(absence);
    await user.type(absence, '45');
    await user.click(
      screen.getByRole('radio', { name: new RegExp(t('autopilot.mode.automatic')) }),
    );
    await user.click(screen.getByRole('button', { name: t('settings.save') }));

    expect(await screen.findByText(t('settings.saved'))).toBeVisible();
    expect(backend.state.settingsPuts).toEqual([
      { mode: 'AUTOMATIC', operator_absence_minutes: 45, reserve_floor_pct: 25 },
    ]);
  });

  it('refuses minutes out of range before asking the server', async () => {
    const backend = open();
    const user = userEvent.setup();

    const absence = await screen.findByLabelText(t('settings.absenceLabel'));
    await user.clear(absence);
    await user.type(absence, '5000');
    await user.click(screen.getByRole('button', { name: t('settings.save') }));

    expect(await screen.findByText(/entre 1 y 1440/)).toBeVisible();
    expect(backend.state.settingsPuts).toHaveLength(0);
  });

  it('runs a cycle now', async () => {
    const backend = open();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('settings.runNow') }));

    expect(await screen.findByText(t('settings.ranCount', { count: '1' }))).toBeVisible();
    expect(backend.state.runs).toBe(1);
  });

  it('shows the history with source, state, reason of a skipped decision and who settled it', async () => {
    const backend = createLiveBackend();
    backend.decisions.push(
      buildDecision({
        id: '0190f3a2-0000-7000-8000-0000000000d2',
        source: 'LLM',
        status: 'SKIPPED',
        status_detail: 'RESERVE_FLOOR',
      }),
      buildDecision({
        id: '0190f3a2-0000-7000-8000-0000000000d3',
        status: 'EXECUTED',
        decided_by: null,
      }),
    );
    server.use(...backend.handlers);
    renderApp(ROUTE_PATHS.board.autopilot, { user: MEMBER });

    const table = await screen.findByRole('table');
    expect(await within(table).findByText(t('history.status.skipped'))).toBeVisible();
    expect(within(table).getByText(t('history.detail.reserveFloor'))).toBeVisible();
    expect(within(table).getByText(t('history.byPilot'))).toBeVisible();
    expect(within(table).getAllByText(t('assistant.source.llm')).length).toBeGreaterThan(0);
  });

  it('lets a Board member read but not change the settings', async () => {
    open(MEMBER);

    expect(await screen.findByText(t('settings.readOnly'))).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: t('settings.runNow') })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: t('settings.save') })).not.toBeInTheDocument();
  });
});
